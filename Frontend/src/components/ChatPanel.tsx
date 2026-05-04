import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage, Trial, UserProfile } from "@/data/types";
import { trials } from "@/data/trials";
import { getRankedByBoth, getNearestTrials, getRankedTrials } from "@/lib/trialMatching";
import { useAssistant } from "@/contexts/AssistantContext";
import { ConversationState, extractProfileFromFile, checkGroqHealth, resetToPrimaryKey } from "@/lib/groqService";
import TrialResultCard from "./TrialResultCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, RotateCcw, Paperclip, X, Loader2, CheckCircle2 } from "lucide-react";

interface ChatPanelProps {
  userProfile?: UserProfile;
  onTrialsFound?: (trials: Trial[]) => void;
  onZoomToLocation?: (trial: Trial) => void;
  onViewTrialDetails?: (trial: Trial) => void;
  onViewSummary?: (trial: Trial) => void;
  selectedTrialId?: string | null;
}

type PostSearchIntent = "nearest" | "best" | "recruiting" | "both" | "all" | null;

// ── Progress step bar ──────────────────────────────────────────────────────
const STEPS = [
  { key: "cancer_type", label: "Cancer Type", icon: "🎗️" },
  { key: "disease_stage", label: "Stage", icon: "📊" },
  { key: "age", label: "Age", icon: "👤" },
  { key: "location", label: "Location", icon: "📍" },
  { key: "biomarkers", label: "Biomarkers", icon: "🧬" },
  { key: "diagnosis_date", label: "Diagnosis", icon: "📅" },
  { key: "confirm", label: "Confirm", icon: "✓" },
];

function getStepIndex(state: ConversationState, searchDone: boolean): number {
  if (searchDone) return 7;
  if (!state.cancer_type) return 0;
  if (!state.disease_stage) return 1;
  if (!state.age) return 2;
  if (!state.city && !state.province) return 3;
  if (state.biomarkers === undefined) return 4;
  if (!state.diagnosis_date) return 5;
  return 6;
}

function ProgressBar({ state, searchDone }: { state: ConversationState; searchDone: boolean }) {
  const currentStep = getStepIndex(state, searchDone);
  const pct = Math.min(Math.round((currentStep / 7) * 100), 100);

  return (
    <div className="px-4 py-3 border-b border-border bg-secondary/20">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {searchDone ? "Profile complete" : `Step ${Math.min(currentStep + 1, 7)} of 7`}
        </span>
        <span className="text-xs font-semibold text-primary">
          {searchDone ? "✓ Matched" : `${pct}%`}
        </span>
      </div>
      <div className="relative h-1.5 bg-border rounded-full overflow-hidden mb-2">
        <div
          className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const done = currentStep > idx || searchDone;
          const active = currentStep === idx && !searchDone;
          return (
            <div key={step.key} className="flex flex-col items-center gap-0.5" style={{ flex: 1 }}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                done ? "bg-primary text-primary-foreground shadow-md" :
                active ? "bg-primary/20 text-primary border-2 border-primary animate-pulse" :
                "bg-border text-muted-foreground"
              }`}>
                {done ? "✓" : active ? step.icon : step.icon}
              </div>
              <span className={`text-[8px] font-medium leading-none text-center ${done || active ? "text-primary" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
        <div className="flex flex-col items-center gap-0.5" style={{ flex: 1 }}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
            searchDone ? "bg-emerald-500 text-white shadow-md" : "bg-border text-muted-foreground"
          }`}>
            {searchDone ? "✓" : "🔍"}
          </div>
          <span className={`text-[8px] font-medium leading-none ${searchDone ? "text-emerald-600" : "text-muted-foreground"}`}>
            Results
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Confirmation table renderer ────────────────────────────────────────────
function ConfirmationTable({ content }: { content: string }) {
  const hasTable = content.includes("| Detail |") || content.includes("|---|") || (content.includes("|") && content.includes("Cancer Type"));

  if (!hasTable) {
    return (
      <div className="text-sm prose prose-sm max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0 [&>table]:w-full [&>table]:border-collapse [&>table]:rounded-lg [&>table]:overflow-hidden [&>table]:my-2 [&>table>thead]:bg-primary/10 [&>table>thead>tr>th]:px-3 [&>table>thead>tr>th]:py-2 [&>table>thead>tr>th]:text-left [&>table>thead>tr>th]:text-xs [&>table>thead>tr>th]:font-semibold [&>table>tbody>tr>td]:px-3 [&>table>tbody>tr>td]:py-2 [&>table>tbody>tr>td]:text-xs [&>table>tbody>tr>td]:border-t [&>table>tbody>tr>td]:border-border [&>table>tbody>tr]:hover:bg-muted/50">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  const lines = content.split("\n");
  const tableRows: { detail: string; value: string }[] = [];
  let inTable = false, preText = "", postText = "", passedTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("| Detail |") || line.startsWith("| **Detail**")) { inTable = true; continue; }
    if (inTable && (line.startsWith("|---") || line.startsWith("| ---") || line === "|---|---|")) continue;
    if (inTable && line.startsWith("|") && line.endsWith("|")) {
      const parts = line.split("|").map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) tableRows.push({ detail: parts[0], value: parts[1] });
    } else if (inTable && !line.startsWith("|")) {
      inTable = false; passedTable = true; postText += lines[i] + "\n";
    } else if (!inTable && !passedTable) { preText += lines[i] + "\n"; }
    else if (passedTable) { postText += lines[i] + "\n"; }
  }

  const iconMap: Record<string, string> = { "Cancer Type": "🎗️", "Stage": "📊", "Age": "👤", "Location": "📍", "Biomarkers": "🧬", "Diagnosis Date": "📅" };
  const colorMap: Record<string, string> = { "Cancer Type": "bg-rose-50", "Stage": "bg-purple-50", "Age": "bg-blue-50", "Location": "bg-teal-50", "Biomarkers": "bg-amber-50", "Diagnosis Date": "bg-indigo-50" };
  const borderMap: Record<string, string> = { "Cancer Type": "border-l-rose-300", "Stage": "border-l-purple-300", "Age": "border-l-blue-300", "Location": "border-l-teal-300", "Biomarkers": "border-l-amber-300", "Diagnosis Date": "border-l-indigo-300" };

  return (
    <div className="space-y-3">
      {preText.trim() && <div className="text-sm prose prose-sm max-w-none [&>p]:m-0"><ReactMarkdown remarkPlugins={[remarkGfm]}>{preText.trim()}</ReactMarkdown></div>}
      {tableRows.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="bg-primary px-4 py-2.5">
            <span className="text-primary-foreground text-sm font-semibold">Your Profile Summary</span>
          </div>
          <div className="divide-y divide-border">
            {tableRows.map((row, idx) => (
              <div key={idx} className={`flex items-center gap-3 px-4 py-3 ${colorMap[row.detail] || "bg-white"} border-l-2 ${borderMap[row.detail] || "border-l-gray-300"}`}>
                <span className="text-lg w-7 flex-shrink-0">{iconMap[row.detail] || "•"}</span>
                <div className="flex-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{row.detail}</span>
                  <span className={`text-sm font-medium text-right ${row.value === "Not specified" ? "text-muted-foreground italic" : "text-foreground"}`}>{row.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {postText.trim() && <div className="text-sm prose prose-sm max-w-none [&>p]:m-0"><ReactMarkdown remarkPlugins={[remarkGfm]}>{postText.trim()}</ReactMarkdown></div>}
    </div>
  );
}

// ── Dynamic chips ──────────────────────────────────────────────────────────
function extractSuggestionsFromResponse(content: string): string[] {
  // Extract suggestions from LLM response in format: [SUGGESTIONS: "opt1" | "opt2" | "opt3"]
  const match = content.match(/\[SUGGESTIONS:\s*([^\]]+)\]/i);
  if (match) {
    const suggestionsText = match[1];
    // Split by | and clean up quotes
    return suggestionsText
      .split('|')
      .map(s => s.trim().replace(/^["']|["']$/g, ''))
      .filter(s => s.length > 0);
  }
  return [];
}

function cleanResponseContent(content: string): string {
  // Remove the [SUGGESTIONS: ...] part from the displayed content
  return content.replace(/\[SUGGESTIONS:\s*[^\]]+\]/i, '').trim();
}

function getDynamicSuggestions(lastContent: string, hasAnyTrialResults: boolean, searchDone: boolean): string[] {
  // First try to extract LLM-generated suggestions
  const llmSuggestions = extractSuggestionsFromResponse(lastContent);
  if (llmSuggestions.length > 0) {
    return llmSuggestions;
  }
  
  // Fallback to static suggestions if LLM didn't provide any
  const c = lastContent.toLowerCase();
  if ((c.includes("|") && c.includes("cancer type")) || c.includes("does everything look correct") || c.includes("look correct") || c.includes("find your matching trials once you confirm") || c.includes("once you confirm"))
    return ["Yes, that's correct!", "I need to change something"];
  if (c.includes("what would you like to change") || c.includes("which detail"))
    return ["Change cancer type", "Change stage", "Change age", "Change location"];
  if (c.includes("what stage") || c.includes("which stage") || c.includes("stage has your") || c.includes("stage is your") || c.includes("early") || c.includes("advanced") || c.includes("spread"))
    return ["It's early", "Stage 2", "Stage 3", "It has spread"];
  if (c.includes("what type") || c.includes("type of cancer") || c.includes("start fresh") || c.includes("let's start") || c.includes("diagnosed with"))
    return ["Lung cancer", "Breast cancer", "Colorectal cancer", "Prostate cancer"];
  if (c.includes("how old") || c.includes("your age") || c.includes("old are you"))
    return ["I'm 35 years old", "I'm 45", "I'm 55", "I'm 65"];
  if (c.includes("which city") || c.includes("city in canada") || c.includes("city are you") || (c.includes("located") && !c.includes("trial")))
    return ["Toronto", "Vancouver", "Montreal", "Calgary"];
  if (c.includes("biomarker") || c.includes("egfr") || c.includes("pd-l1") || c.includes("mutation"))
    return ["EGFR positive", "PD-L1 positive", "I don't know", "Skip this"];
  if (c.includes("when were you first") || c.includes("first diagnosed") || c.includes("how long ago") || c.includes("diagnosis date"))
    return ["About 3 months ago", "About 6 months ago", "Last year", "I'd rather skip"];
  if (hasAnyTrialResults && searchDone)
    return ["Find nearest trials", "Show best matches", "Show recruiting trials", "Best and nearest"];
  return [];
}

function detectPostSearchIntent(msg: string): PostSearchIntent {
  const lower = msg.toLowerCase();
  const hasNear = ["nearest", "closest", "near me", "nearby"].some(w => lower.includes(w));
  const hasBest = ["best", "top", "highest match", "most suitable"].some(w => lower.includes(w));
  const hasRecruit = ["recruiting", "open", "accepting", "enrolling"].some(w => lower.includes(w));
  if (hasNear && hasBest) return "both";
  if (lower.includes("all trials") || lower.includes("show all")) return "all";
  if (hasNear) return "nearest";
  if (hasBest) return "best";
  if (hasRecruit) return "recruiting";
  return null;
}

function detectNewSearchIntent(msg: string): boolean {
  const lower = msg.toLowerCase();
  const phrases = ["check for", "search for", "look for", "find trials for", "what about", "now check", "switch to", "different cancer", "another cancer", "can we check", "can you check", "how about"];
  const cancers = ["lung", "breast", "brain", "colorectal", "prostate", "melanoma", "ovarian", "lymphoma", "pancreatic", "thyroid", "bladder", "kidney", "myeloma", "liver", "sarcoma", "leukemia", "gastric", "cervical", "endometrial"];
  return cancers.some(c => lower.includes(c)) && phrases.some(p => lower.includes(p));
}

// ── Main Component ─────────────────────────────────────────────────────────
const ChatPanel = ({ userProfile, onTrialsFound, onZoomToLocation, onViewSummary, selectedTrialId }: ChatPanelProps) => {
  const { messages, setMessages, setUserProfile, setProfileReady, chatService, searchDone, setSearchDone, allFoundTrials, setAllFoundTrials } = useAssistant();

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [convState, setConvState] = useState<ConversationState>({ isComplete: false });
  const [isOnline, setIsOnline] = useState<boolean | null>(null); // null = checking, true = online, false = offline
  const [lastErrorTime, setLastErrorTime] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const trialCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Groq health only on mount and after errors
  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await checkGroqHealth();
      const wasOffline = isOnline === false;
      setIsOnline(healthy);
      
      // If it just went offline, add a message
      if (!healthy && isOnline !== false) {
        setMessages(prev => [...prev, {
          id: `offline-${Date.now()}`,
          role: "assistant",
          content: "⚠️ I'm having trouble connecting to the AI service. Please check your internet connection or try again in a moment."
        }]);
      }
      
      // If it just came back online after being offline
      if (healthy && wasOffline) {
        setMessages(prev => [...prev, {
          id: `online-${Date.now()}`,
          role: "assistant",
          content: "✅ Connection restored! I'm back online and ready to help."
        }]);
      }
    };
    
    // Check on mount
    checkHealth();
  }, [isOnline, setMessages]);

  // Recheck health after errors (with debounce)
  useEffect(() => {
    if (lastErrorTime > 0) {
      const timer = setTimeout(async () => {
        const healthy = await checkGroqHealth();
        setIsOnline(healthy);
      }, 2000); // Wait 2 seconds after error before rechecking
      
      return () => clearTimeout(timer);
    }
  }, [lastErrorTime]);

  // Periodically try to reset to primary key (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      resetToPrimaryKey();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && !lastMsg.trials) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedTrialId && trialCardRefs.current[selectedTrialId]) {
      trialCardRefs.current[selectedTrialId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      const card = trialCardRefs.current[selectedTrialId];
      if (card) { card.style.boxShadow = "0 0 0 3px hsl(var(--primary))"; setTimeout(() => { card.style.boxShadow = ""; }, 2000); }
    }
  }, [selectedTrialId]);

  const buildProfile = useCallback(async (): Promise<UserProfile> => {
    const coords = await chatService.getCityCoordinates();
    const profileUpdates = chatService.buildUserProfile();
    const state = chatService.getState();
    return { ...(userProfile || {} as UserProfile), ...profileUpdates, latitude: coords.latitude, longitude: coords.longitude, location: `${state.city || ""}, ${state.province || ""}` };
  }, [chatService, userProfile]);

  const performTrialSearch = useCallback(async () => {
    const state = chatService.getState();
    let found: Trial[] = trials.filter((t) => {
      if (state.cancer_type && !t.cancer_type.toLowerCase().includes(state.cancer_type.toLowerCase())) return false;
      if (state.disease_stage) { const s = state.disease_stage.match(/[IViv]+$/)?.[0]; if (s && !t.disease_stage.toUpperCase().includes(s.toUpperCase())) return false; }
      return true;
    });
    if (found.length === 0 && state.cancer_type) found = trials.filter(t => t.cancer_type.toLowerCase().includes(state.cancer_type!.toLowerCase()));
    const updatedProfile = await buildProfile();
    setUserProfile(updatedProfile);
    setProfileReady(true);
    setAllFoundTrials(found);
    if (found.length > 0) found = getRankedByBoth(found, updatedProfile).slice(0, 8);
    return { found, profile: updatedProfile };
  }, [chatService, buildProfile, setUserProfile, setProfileReady, setAllFoundTrials]);

  const handlePostSearchIntent = useCallback((intent: PostSearchIntent, profile: UserProfile) => {
    if (!intent || allFoundTrials.length === 0) return null;
    switch (intent) {
      case "nearest": { const n = getNearestTrials(allFoundTrials, profile, 5); return { trials: n, message: `Here are the **${n.length} nearest trials** to ${profile.city || "your location"}:` }; }
      case "best": { const b = getRankedTrials(allFoundTrials, profile).slice(0, 5); return { trials: b, message: `Here are the **top ${b.length} best-matching trials** for your profile:` }; }
      case "recruiting": { const r = allFoundTrials.filter(t => t.recruitment_status === "Recruiting"); const ranked = getRankedByBoth(r, profile).slice(0, 6); return { trials: ranked, message: `Found **${r.length} recruiting trials**. Here are the top matches:` }; }
      case "both": { const ranked = getRankedByBoth(allFoundTrials, profile).slice(0, 6); return { trials: ranked, message: `Here are trials ranked by **both proximity and match score**:` }; }
      case "all": { const ranked = getRankedByBoth(allFoundTrials, profile).slice(0, 12); return { trials: ranked, message: `Showing **${ranked.length} of ${allFoundTrials.length} total trials** found:` }; }
      default: return null;
    }
  }, [allFoundTrials]);

  // ── File upload — accepts PDF and images ──────────────────────────────
  const handleFileUpload = async (file: File) => {
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: "assistant",
        content: "Please upload a PDF or an image file (JPG, PNG, WebP) of your medical report.",
      }]);
      return;
    }

    setUploadedFileName(file.name);
    setIsExtracting(true);

    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: "user",
      content: `📎 Uploaded: ${file.name}`,
    }]);

    try {
      const extracted = await extractProfileFromFile(file);
      const foundFields = Object.keys(extracted).filter(k => extracted[k as keyof typeof extracted] !== undefined);

      if (foundFields.length === 0) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(), role: "assistant",
          content: "I wasn't able to extract medical information from this file. Please make sure it's a clear pathology or lab report. You can also type your details directly.",
        }]);
        setIsExtracting(false);
        setUploadedFileName(null);
        return;
      }

      chatService.injectExtractedProfile(extracted);
      setConvState(chatService.getState());

      const profileUpdates = chatService.buildUserProfile();
      if (Object.keys(profileUpdates).length > 0) {
        const coords = await chatService.getCityCoordinates();
        setUserProfile({ ...(userProfile || {} as UserProfile), ...profileUpdates, latitude: coords.latitude, longitude: coords.longitude });
      }

      const result = await chatService.sendMessage("[Report processed, please acknowledge what was found and ask for missing fields]");
      setConvState(chatService.getState());
      
      // Mark as online after successful response
      if (isOnline !== true) setIsOnline(true);

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: result.response }]);

      if (result.shouldSearch) {
        setSearchDone(false); setAllFoundTrials([]);
        const { found } = await performTrialSearch();
        setSearchDone(true);
        if (onTrialsFound) onTrialsFound(found);
        setMessages(prev => [...prev, {
          id: (Date.now() + 2).toString(), role: "assistant",
          content: found.length > 0 ? `I found **${found.length} matching trial${found.length > 1 ? "s" : ""}** for you. Here are your best matches:` : "No trials found matching your criteria.",
          trials: found.length > 0 ? found : undefined,
        }]);
      }
    } catch (error) {
      console.error("Extraction error:", error);
      
      // Parse error message for user-friendly display
      const errorMessage = error instanceof Error ? error.message : String(error);
      let userMessage = "I had trouble reading that file. Please try a clearer image or a different PDF, or just type your details directly.";
      
      if (errorMessage.includes("API_RATE_LIMIT")) {
        userMessage = "⏱️ We've hit our API rate limit. Please wait a moment and try again, or type your details directly instead.";
      } else if (errorMessage.includes("API_AUTH_ERROR")) {
        userMessage = "🔑 There's an issue with the API authentication. Please contact support or type your details directly.";
      } else if (errorMessage.includes("API_SERVER_ERROR")) {
        userMessage = "🔧 The AI service is temporarily unavailable. Please try again in a moment, or type your details directly.";
      }
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: "assistant",
        content: userMessage,
      }]);
      setUploadedFileName(null);
      setIsOnline(false);
      setLastErrorTime(Date.now());
    }

    setIsExtracting(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: input }]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    try {
      const isNewSearch = detectNewSearchIntent(currentInput);

      if (searchDone && userProfile && !isNewSearch) {
        const intent = detectPostSearchIntent(currentInput);
        if (intent) {
          const result = handlePostSearchIntent(intent, userProfile);
          if (result) {
            if (onTrialsFound) onTrialsFound(result.trials);
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: result.message, trials: result.trials }]);
            setIsTyping(false);
            return;
          }
        }
      }

      if (isNewSearch && searchDone) { setSearchDone(false); setAllFoundTrials([]); if (onTrialsFound) onTrialsFound([]); }

      const result = await chatService.sendMessage(currentInput);
      setConvState(chatService.getState());
      
      // Mark as online after successful response
      if (isOnline !== true) setIsOnline(true);

      if (result.shouldSearch) {
        setSearchDone(false); setAllFoundTrials([]);
        const { found } = await performTrialSearch();
        setSearchDone(true);
        if (onTrialsFound) onTrialsFound(found);
        setMessages(prev => [...prev,
          { id: (Date.now() + 1).toString(), role: "assistant", content: result.response },
          { id: (Date.now() + 2).toString(), role: "assistant", content: found.length > 0 ? `I found **${found.length} matching trial${found.length > 1 ? "s" : ""}** for you. Here are your best matches:` : "I couldn't find trials matching your criteria. Try broadening your search or clicking **Start over**.", trials: found.length > 0 ? found : undefined },
        ]);
      } else {
        if (userProfile) {
          const profileUpdates = chatService.buildUserProfile();
          if (Object.keys(profileUpdates).length > 0) {
            const state = chatService.getState();
            if (state.city) { 
              const coords = await chatService.getCityCoordinates(); 
              setUserProfile({ ...userProfile, ...profileUpdates, latitude: coords.latitude, longitude: coords.longitude }); 
            }
            else setUserProfile({ ...userProfile, ...profileUpdates });
          }
        }
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: result.response }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      
      // Parse error message for user-friendly display
      const errorMessage = error instanceof Error ? error.message : String(error);
      let userMessage = "Sorry, I'm having trouble connecting. Please try again.";
      
      if (errorMessage.includes("API_RATE_LIMIT")) {
        userMessage = "⏱️ We've hit our API rate limit. Please wait a moment and try again. Our backup system will kick in shortly.";
      } else if (errorMessage.includes("API_AUTH_ERROR")) {
        userMessage = "🔑 There's an authentication issue with the AI service. Please contact support.";
      } else if (errorMessage.includes("API_SERVER_ERROR")) {
        userMessage = "🔧 The AI service is temporarily unavailable. Please try again in a moment.";
      } else if (errorMessage.includes("NetworkError") || errorMessage.includes("Failed to fetch")) {
        userMessage = "🌐 Network connection issue. Please check your internet connection and try again.";
      }
      
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: userMessage }]);
      setIsOnline(false);
      setLastErrorTime(Date.now());
    }
    setIsTyping(false);
  };

  const handleReset = () => {
    chatService.reset();
    setSearchDone(false); setAllFoundTrials([]); setConvState({ isComplete: false }); setUploadedFileName(null);
    if (onTrialsFound) onTrialsFound([]);
    setProfileReady(false);
    setMessages([{ id: "welcome", role: "assistant", content: "Hi there! 👋 I'm here to help you find clinical trials in Canada. I know navigating this can feel overwhelming, so I'll keep things simple. To start — what type of cancer have you been diagnosed with?" }]);
  };

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");
  const lastContent = lastAssistantMsg?.content || "";
  const hasAnyTrialResults = messages.some(m => m.trials && m.trials.length > 0);
  const suggestions = getDynamicSuggestions(lastContent, hasAnyTrialResults, searchDone);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground text-sm">AI Trial Assistant</h2>
            <p className="text-xs text-muted-foreground">
              {searchDone ? "Ask about results or search a new cancer type" : "Tell me about your condition"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              isOnline === null 
                ? "text-muted-foreground bg-muted animate-pulse" 
                : isOnline 
                  ? "text-primary bg-primary/10" 
                  : "text-destructive bg-destructive/10"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                isOnline === null 
                  ? "bg-muted-foreground" 
                  : isOnline 
                    ? "bg-primary animate-pulse" 
                    : "bg-destructive"
              }`} />
              {isOnline === null ? "Checking..." : isOnline ? "Online" : "Offline"}
            </div>
            {isOnline === false && (
              <button
                onClick={async () => {
                  setIsOnline(null);
                  const healthy = await checkGroqHealth();
                  setIsOnline(healthy);
                }}
                className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                title="Retry connection"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div data-tour="progress-bar">
        <ProgressBar state={convState} searchDone={searchDone} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "user" ? (
              <div className="chat-bubble-user"><p className="text-sm">{msg.content}</p></div>
            ) : (
              <div className="w-full max-w-md space-y-2">
                <div className="chat-bubble-assistant"><ConfirmationTable content={cleanResponseContent(msg.content)} /></div>
                {msg.trials && msg.trials.length > 0 && msg.trials.map((trial) => (
                  <div key={trial.trial_id} ref={(el) => { trialCardRefs.current[trial.trial_id] = el; }}>
                    <TrialResultCard trial={trial} userProfile={userProfile} onViewDetails={onViewSummary} onZoomToLocation={onZoomToLocation} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {(isTyping || isExtracting) && (
          <div className="flex justify-start">
            <div className="chat-bubble-assistant">
              {isExtracting ? (
                <div className="flex gap-2 items-center">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">
                    Reading your report...
                  </span>
                </div>
              ) : (
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Uploaded file badge */}
      {uploadedFileName && !isExtracting && (
        <div className="mx-3 mb-1 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 truncate">{uploadedFileName}</span>
          <button onClick={() => setUploadedFileName(null)}><X className="w-3 h-3 text-emerald-500 hover:text-emerald-700" /></button>
        </div>
      )}

      {/* Input area — single row, no duplicate banner */}
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex gap-2">
          {/* Upload button - always visible */}
          <button
            data-tour="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isExtracting || isOnline === false}
            title={isOnline === false ? "AI Assistant is offline" : "Upload medical report (PDF or image)"}
            className="rounded-full border border-border p-2.5 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {isExtracting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Paperclip className="w-4 h-4" />
            }
          </button>

          <input
            type="text"
            data-tour="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isTyping && !isExtracting && isOnline && handleSend()}
            placeholder={
              isOnline === false 
                ? "AI Assistant is offline. Please check your connection..." 
                : searchDone 
                  ? "Ask about results or try a new cancer type..." 
                  : "Type your details or upload a report 📎"
            }
            className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isTyping || isExtracting || isOnline === false}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping || isExtracting || isOnline === false}
            className="rounded-full bg-primary text-primary-foreground p-2.5 disabled:opacity-50 hover:opacity-90 transition-opacity flex-shrink-0"
            title={isOnline === false ? "AI Assistant is offline" : "Send message"}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden file input — PDF + images */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = "";
          }}
        />

        {/* Dynamic suggestion chips */}
        <div className="flex gap-2 flex-wrap">
          {suggestions.map((s) => (
            <button key={s} onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              {s}
            </button>
          ))}
          <button onClick={handleReset}
            className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            Start over
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
