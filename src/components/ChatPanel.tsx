import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage, Trial, UserProfile } from "@/data/types";
import { trials } from "@/data/trials";
import { getRankedByBoth, getNearestTrials, getRankedTrials, calculateTrialSuitability, calculateDistance } from "@/lib/trialMatching";
import { useAssistant } from "@/contexts/AssistantContext";
import TrialResultCard from "./TrialResultCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, RotateCcw } from "lucide-react";

interface ChatPanelProps {
  userProfile?: UserProfile;
  onTrialsFound?: (trials: Trial[]) => void;
  onZoomToLocation?: (trial: Trial) => void;
  onViewTrialDetails?: (trial: Trial) => void;
  onViewSummary?: (trial: Trial) => void;
  selectedTrialId?: string | null;
}

type PostSearchIntent = "nearest" | "best" | "recruiting" | "both" | "all" | null;

function detectPostSearchIntent(msg: string): PostSearchIntent {
  const lower = msg.toLowerCase();
  const nearWords = ["nearest", "closest", "near me", "nearby", "close to me", "near my"];
  const bestWords = ["best", "top", "highest match", "most suitable", "recommended"];
  const recruitWords = ["recruiting", "open", "accepting", "enrolling"];

  const hasNear = nearWords.some(w => lower.includes(w));
  const hasBest = bestWords.some(w => lower.includes(w));
  const hasRecruit = recruitWords.some(w => lower.includes(w));

  if (hasNear && hasBest) return "both";
  if (lower.includes("all trials") || lower.includes("show all") || lower.includes("list all")) return "all";
  if (hasNear) return "nearest";
  if (hasBest) return "best";
  if (hasRecruit) return "recruiting";
  return null;
}

// ── Beautiful confirmation table renderer ──────────────────────────────────
function ConfirmationTable({ content }: { content: string }) {
  // Check if content contains a markdown table
  if (!content.includes("| Detail |") && !content.includes("|---|")) {
    return (
      <div className="text-sm prose prose-sm max-w-none [&>p]:m-0">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  // Split content into parts: text before table, table, text after table
  const lines = content.split("\n");
  const tableStartIdx = lines.findIndex(l => l.trim().startsWith("| Detail") || l.trim().startsWith("|---|") || l.trim().startsWith("| ---"));
  
  // Find table rows
  const tableRows: { detail: string; value: string }[] = [];
  let inTable = false;
  let preText = "";
  let postText = "";
  let passedTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("| Detail |") || line.startsWith("| **Detail**")) {
      inTable = true;
      continue; // skip header
    }
    if (inTable && (line.startsWith("|---") || line.startsWith("| ---") || line === "|---|---|")) {
      continue; // skip separator
    }
    if (inTable && line.startsWith("|") && line.endsWith("|")) {
      const parts = line.split("|").map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        tableRows.push({ detail: parts[0], value: parts[1] });
      }
    } else if (inTable && !line.startsWith("|")) {
      inTable = false;
      passedTable = true;
      postText += lines[i] + "\n";
    } else if (!inTable && !passedTable) {
      preText += lines[i] + "\n";
    } else if (passedTable) {
      postText += lines[i] + "\n";
    }
  }

  const iconMap: Record<string, string> = {
    "Cancer Type": "🎗️",
    "Stage": "📊",
    "Age": "👤",
    "Location": "📍",
    "Biomarkers": "🧬",
    "Diagnosis Date": "📅",
  };

  const colorMap: Record<string, string> = {
    "Cancer Type": "bg-rose-50 border-rose-100",
    "Stage": "bg-purple-50 border-purple-100",
    "Age": "bg-blue-50 border-blue-100",
    "Location": "bg-teal-50 border-teal-100",
    "Biomarkers": "bg-amber-50 border-amber-100",
    "Diagnosis Date": "bg-indigo-50 border-indigo-100",
  };

  return (
    <div className="space-y-3">
      {preText.trim() && (
        <div className="text-sm prose prose-sm max-w-none [&>p]:m-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{preText.trim()}</ReactMarkdown>
        </div>
      )}

      {tableRows.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          {/* Header */}
          <div className="bg-primary px-4 py-2.5 flex items-center gap-2">
            <span className="text-primary-foreground text-sm font-semibold">Your Profile Summary</span>
          </div>
          {/* Rows */}
          <div className="divide-y divide-border">
            {tableRows.map((row, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 px-4 py-3 ${colorMap[row.detail] || "bg-white"} border-l-2 ${
                  colorMap[row.detail]?.includes("rose") ? "border-l-rose-300" :
                  colorMap[row.detail]?.includes("purple") ? "border-l-purple-300" :
                  colorMap[row.detail]?.includes("blue") ? "border-l-blue-300" :
                  colorMap[row.detail]?.includes("teal") ? "border-l-teal-300" :
                  colorMap[row.detail]?.includes("amber") ? "border-l-amber-300" :
                  "border-l-indigo-300"
                }`}
              >
                <span className="text-lg w-7 flex-shrink-0">{iconMap[row.detail] || "•"}</span>
                <div className="flex-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {row.detail}
                  </span>
                  <span className={`text-sm font-medium text-right ${
                    row.value === "Not specified" ? "text-muted-foreground italic" : "text-foreground"
                  }`}>
                    {row.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {postText.trim() && (
        <div className="text-sm prose prose-sm max-w-none [&>p]:m-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{postText.trim()}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
const ChatPanel = ({
  userProfile, onTrialsFound, onZoomToLocation, onViewTrialDetails,
  onViewSummary, selectedTrialId
}: ChatPanelProps) => {
  const {
    messages, setMessages, setUserProfile, setProfileReady,
    chatService, searchDone, setSearchDone, allFoundTrials, setAllFoundTrials
  } = useAssistant();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [convState, setConvState] = useState(chatService.getState());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const trialCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && !lastMsg.trials) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedTrialId && trialCardRefs.current[selectedTrialId]) {
      trialCardRefs.current[selectedTrialId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      const card = trialCardRefs.current[selectedTrialId];
      if (card) {
        card.style.boxShadow = "0 0 0 3px hsl(var(--primary))";
        setTimeout(() => { card.style.boxShadow = ""; }, 2000);
      }
    }
  }, [selectedTrialId]);

  const buildProfile = useCallback(() => {
    const coords = chatService.getCityCoordinates();
    const profileUpdates = chatService.buildUserProfile();
    const state = chatService.getState();
    const updatedProfile: UserProfile = {
      ...(userProfile || {} as UserProfile),
      ...profileUpdates,
      latitude: coords.latitude,
      longitude: coords.longitude,
      location: `${state.city || ""}, ${state.province || ""}`,
    };
    return updatedProfile;
  }, [chatService, userProfile]);

  const performTrialSearch = useCallback(() => {
    const state = chatService.getState();
    let found: Trial[] = trials.filter((t) => {
      if (state.cancer_type && !t.cancer_type.toLowerCase().includes(state.cancer_type.toLowerCase())) return false;
      if (state.disease_stage) {
        const stageNum = state.disease_stage.match(/[IViv]+$/)?.[0];
        if (stageNum && !t.disease_stage.toUpperCase().includes(stageNum.toUpperCase())) return false;
      }
      return true;
    });

    if (found.length === 0 && state.cancer_type) {
      found = trials.filter(t => t.cancer_type.toLowerCase().includes(state.cancer_type!.toLowerCase()));
    }

    const updatedProfile = buildProfile();
    setUserProfile(updatedProfile);
    setProfileReady(true);
    setAllFoundTrials(found);

    if (found.length > 0) {
      found = getRankedByBoth(found, updatedProfile).slice(0, 8);
    }

    return { found, profile: updatedProfile };
  }, [chatService, buildProfile, setUserProfile, setProfileReady, setAllFoundTrials]);

  const handlePostSearchIntent = useCallback((intent: PostSearchIntent, profile: UserProfile): { trials: Trial[]; message: string } | null => {
    if (!intent || allFoundTrials.length === 0) return null;

    switch (intent) {
      case "nearest": {
        const nearest = getNearestTrials(allFoundTrials, profile, 5);
        return { trials: nearest, message: `Here are the **${nearest.length} nearest trials** to ${profile.city || "your location"}:` };
      }
      case "best": {
        const best = getRankedTrials(allFoundTrials, profile).slice(0, 5);
        return { trials: best, message: `Here are the **top ${best.length} best-matching trials** for your profile:` };
      }
      case "recruiting": {
        const recruiting = allFoundTrials.filter(t => t.recruitment_status === "Recruiting");
        const ranked = getRankedByBoth(recruiting, profile).slice(0, 6);
        return { trials: ranked, message: `Found **${recruiting.length} recruiting trials**. Here are the top matches:` };
      }
      case "both": {
        const ranked = getRankedByBoth(allFoundTrials, profile).slice(0, 6);
        return { trials: ranked, message: `Here are trials ranked by **both proximity and match score**:` };
      }
      case "all": {
        const ranked = getRankedByBoth(allFoundTrials, profile).slice(0, 12);
        return { trials: ranked, message: `Showing **${ranked.length} of ${allFoundTrials.length} total trials** found:` };
      }
      default:
        return null;
    }
  }, [allFoundTrials]);

  const hasConfirmationTable = (content: string) =>
    content.includes("| Detail |") ||
    content.includes("|---|") ||
    (content.includes("|") && content.includes("Cancer Type"));

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    try {
      // Post-search intent handling
      if (searchDone && userProfile) {
        const intent = detectPostSearchIntent(currentInput);
        if (intent) {
          const result = handlePostSearchIntent(intent, userProfile);
          if (result) {
            if (onTrialsFound) onTrialsFound(result.trials);
            const assistantMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: result.message,
              trials: result.trials,
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setIsTyping(false);
            setConvState(chatService.getState());
            return;
          }
        }
      }

      const result = await chatService.sendMessage(currentInput);
      setConvState(chatService.getState());

      // Only trigger search when LLM says the exact phrase
      if (result.shouldSearch && !searchDone) {
        const { found, profile } = performTrialSearch();
        setSearchDone(true);

        if (onTrialsFound) onTrialsFound(found);

        // Show the LLM's confirmation reply first, then results
        const confirmMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.response,
        };
        setMessages((prev) => [...prev, confirmMsg]);

        const summary = found.length > 0
          ? `I found **${found.length} matching trial${found.length > 1 ? "s" : ""}** for you. Here are your best matches:`
          : "I couldn't find trials matching your exact criteria. Try broadening your search.";

        const assistantMsg: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: summary,
          trials: found.length > 0 ? found : undefined,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        // Update profile progressively
        if (userProfile) {
          const profileUpdates = chatService.buildUserProfile();
          if (Object.keys(profileUpdates).length > 0) {
            const state = chatService.getState();
            if (state.city) {
              const coords = chatService.getCityCoordinates();
              setUserProfile({ ...userProfile, ...profileUpdates, latitude: coords.latitude, longitude: coords.longitude });
            } else {
              setUserProfile({ ...userProfile, ...profileUpdates });
            }
          }
        }

        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.response,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I'm having trouble connecting. Please try again.",
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    }

    setIsTyping(false);
  };

  const handleReset = () => {
    chatService.reset();
    setSearchDone(false);
    setAllFoundTrials([]);
    setConvState({ isComplete: false });
    if (onTrialsFound) onTrialsFound([]);
    setProfileReady(false);
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Hi there! 👋 Let's start fresh. What type of cancer have you been diagnosed with?",
    }]);
  };

  const getSuggestions = (): string[] => {
    if (searchDone) {
      return ["Find nearest trials", "Show best matches", "Show recruiting trials", "Best and nearest"];
    }

    const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");
    const lastContent = lastAssistantMsg?.content?.toLowerCase() || "";

    // Confirmation table shown — offer confirm or change
    if (hasConfirmationTable(lastAssistantMsg?.content || "")) {
      return ["Yes, that's correct!", "I need to change something"];
    }

    if (lastContent.includes("look correct") || lastContent.includes("does everything") || lastContent.includes("shall i search") || lastContent.includes("once you confirm")) {
      return ["Yes, search for trials", "I need to change something"];
    }

    if (lastContent.includes("what would you like to change") || lastContent.includes("which detail")) {
      return ["Change cancer type", "Change stage", "Change age", "Change location"];
    }

    if (lastContent.includes("what stage") || lastContent.includes("which stage") || lastContent.includes("stage of")) {
      return ["Stage 1", "Stage 2", "Stage 3", "Stage 4"];
    }

    if (lastContent.includes("what type") || lastContent.includes("which type") || lastContent.includes("diagnosed with")) {
      return ["Lung cancer", "Breast cancer", "Colorectal cancer", "Prostate cancer"];
    }

    if (lastContent.includes("how old") || lastContent.includes("your age") || lastContent.includes("mind me asking")) {
      return ["I'm 45 years old", "I'm 55 years old", "I'm 65 years old"];
    }

    if (lastContent.includes("which city") || lastContent.includes("where are you") || lastContent.includes("located") || lastContent.includes("based in")) {
      return ["I live in Toronto", "I live in Vancouver", "I live in Montreal"];
    }

    if (lastContent.includes("biomarker") || lastContent.includes("genetic mutation") || lastContent.includes("mutation")) {
      return ["EGFR positive", "PD-L1 positive", "I don't know", "No biomarkers"];
    }

    // Diagnosis date question
    if (lastContent.includes("diagnosed") || lastContent.includes("diagnosis date") || lastContent.includes("first diagnosed") || lastContent.includes("when were you")) {
      return ["About 6 months ago", "About a year ago", "2023", "I'd rather not say"];
    }

    if (!convState.cancer_type) return ["I have lung cancer", "I have breast cancer", "I have colorectal cancer"];
    if (!convState.disease_stage) return ["Stage 1", "Stage 2", "Stage 3", "Stage 4"];
    if (!convState.age) return ["I'm 45 years old", "I'm 55 years old", "I'm 65 years old"];
    if (!convState.city) return ["I live in Toronto", "I live in Vancouver", "I live in Montreal"];

    return [];
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground text-sm">AI Trial Assistant</h2>
            <p className="text-xs text-muted-foreground">
              {searchDone ? "Ask me about your trial results" : "Tell me about your condition"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              Online
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "user" ? (
              <div className="chat-bubble-user">
                <p className="text-sm">{msg.content}</p>
              </div>
            ) : (
              <div className="w-full max-w-md space-y-2">
                <div className="chat-bubble-assistant">
                  <ConfirmationTable content={msg.content} />
                </div>
                {msg.trials && msg.trials.length > 0 && msg.trials.map((trial) => (
                  <div
                    key={trial.trial_id}
                    ref={(el) => { trialCardRefs.current[trial.trial_id] = el; }}
                  >
                    <TrialResultCard
                      trial={trial}
                      userProfile={userProfile}
                      onViewDetails={onViewSummary}
                      onZoomToLocation={onZoomToLocation}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="chat-bubble-assistant">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isTyping && handleSend()}
            placeholder={searchDone ? "Ask about your results..." : "Tell me about your condition..."}
            className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="rounded-full bg-primary text-primary-foreground p-2.5 disabled:opacity-50 hover:opacity-90 transition-opacity"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestion Chips */}
        <div className="flex gap-2 flex-wrap">
          {getSuggestions().map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {s}
            </button>
          ))}
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Start over
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
