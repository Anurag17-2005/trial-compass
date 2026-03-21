import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage, Trial, UserProfile } from "@/data/types";
import { trials } from "@/data/trials";
import { getRankedByBoth, getNearestTrials, getRankedTrials } from "@/lib/trialMatching";
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

// Detect if user is initiating a brand new cancer search mid-conversation
function detectNewSearchIntent(msg: string): boolean {
  const lower = msg.toLowerCase();
  const newSearchPhrases = [
    "check for", "search for", "look for", "find trials for",
    "what about", "now check", "try", "switch to", "instead",
    "different cancer", "another cancer", "new search", "can we check",
    "can you check", "how about", "what if i had"
  ];
  const cancerTypes = [
    "lung", "breast", "brain", "colorectal", "colon", "prostate", "melanoma",
    "ovarian", "lymphoma", "pancreatic", "thyroid", "bladder", "kidney",
    "myeloma", "liver", "sarcoma", "leukemia", "head and neck", "gastric",
    "cervical", "endometrial"
  ];
  const hasCancer = cancerTypes.some(c => lower.includes(c));
  const hasNewPhrase = newSearchPhrases.some(p => lower.includes(p));
  return hasCancer && hasNewPhrase;
}

// ── Confirmation table renderer ────────────────────────────────────────────
function ConfirmationTable({ content }: { content: string }) {
  const hasTable =
    content.includes("| Detail |") ||
    content.includes("|---|") ||
    (content.includes("|") && content.includes("Cancer Type"));

  if (!hasTable) {
    return (
      <div className="text-sm prose prose-sm max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0 [&>table]:w-full [&>table]:border-collapse [&>table]:rounded-lg [&>table]:overflow-hidden [&>table]:my-2 [&>table>thead]:bg-primary/10 [&>table>thead>tr>th]:px-3 [&>table>thead>tr>th]:py-2 [&>table>thead>tr>th]:text-left [&>table>thead>tr>th]:text-xs [&>table>thead>tr>th]:font-semibold [&>table>thead>tr>th]:text-foreground [&>table>tbody>tr>td]:px-3 [&>table>tbody>tr>td]:py-2 [&>table>tbody>tr>td]:text-xs [&>table>tbody>tr>td]:border-t [&>table>tbody>tr>td]:border-border [&>table>tbody>tr]:hover:bg-muted/50">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  const lines = content.split("\n");
  const tableRows: { detail: string; value: string }[] = [];
  let inTable = false;
  let preText = "";
  let postText = "";
  let passedTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("| Detail |") || line.startsWith("| **Detail**")) {
      inTable = true;
      continue;
    }
    if (inTable && (line.startsWith("|---") || line.startsWith("| ---") || line === "|---|---|")) {
      continue;
    }
    if (inTable && line.startsWith("|") && line.endsWith("|")) {
      const parts = line.split("|").map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) tableRows.push({ detail: parts[0], value: parts[1] });
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
    "Cancer Type": "🎗️", "Stage": "📊", "Age": "👤",
    "Location": "📍", "Biomarkers": "🧬", "Diagnosis Date": "📅",
  };
  const colorMap: Record<string, string> = {
    "Cancer Type": "bg-rose-50", "Stage": "bg-purple-50", "Age": "bg-blue-50",
    "Location": "bg-teal-50", "Biomarkers": "bg-amber-50", "Diagnosis Date": "bg-indigo-50",
  };
  const borderMap: Record<string, string> = {
    "Cancer Type": "border-l-rose-300", "Stage": "border-l-purple-300", "Age": "border-l-blue-300",
    "Location": "border-l-teal-300", "Biomarkers": "border-l-amber-300", "Diagnosis Date": "border-l-indigo-300",
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
          <div className="bg-primary px-4 py-2.5">
            <span className="text-primary-foreground text-sm font-semibold">Your Profile Summary</span>
          </div>
          <div className="divide-y divide-border">
            {tableRows.map((row, idx) => (
              <div key={idx} className={`flex items-center gap-3 px-4 py-3 ${colorMap[row.detail] || "bg-white"} border-l-2 ${borderMap[row.detail] || "border-l-gray-300"}`}>
                <span className="text-lg w-7 flex-shrink-0">{iconMap[row.detail] || "•"}</span>
                <div className="flex-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{row.detail}</span>
                  <span className={`text-sm font-medium text-right ${row.value === "Not specified" ? "text-muted-foreground italic" : "text-foreground"}`}>
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

// ── Dynamic suggestion chips — purely based on last assistant message ───────
function getDynamicSuggestions(lastContent: string, hasAnyTrialResults: boolean): string[] {
  const c = lastContent.toLowerCase();

  // Confirmation table / does everything look correct
  if (
    (c.includes("|") && c.includes("cancer type")) ||
    c.includes("does everything look correct") ||
    c.includes("look correct") ||
    c.includes("find your matching trials once you confirm") ||
    c.includes("once you confirm") ||
    c.includes("shall i search")
  ) {
    return ["Yes, that's correct!", "I need to change something"];
  }

  // What to change
  if (
    c.includes("what would you like to change") ||
    c.includes("which detail") ||
    c.includes("what do you want to update") ||
    c.includes("what would you like to update")
  ) {
    return ["Change cancer type", "Change stage", "Change age", "Change location"];
  }

  // Stage question
  if (
    c.includes("what stage") || c.includes("which stage") ||
    c.includes("stage of") || c.includes("stage has your") ||
    c.includes("stage is your") || c.includes("stage have you")
  ) {
    return ["Stage 1", "Stage 2", "Stage 3", "Stage 4"];
  }

  // Cancer type question (including "let's start fresh" / "what type of lung" etc)
  if (
    c.includes("what type") || c.includes("which type") ||
    c.includes("type of cancer") || c.includes("start fresh") ||
    c.includes("let's start") || c.includes("diagnosed with") ||
    (c.includes("type of") && (c.includes("lung") || c.includes("breast") || c.includes("cancer")))
  ) {
    return ["Lung cancer", "Breast cancer", "Colorectal cancer", "Prostate cancer"];
  }

  // Age question
  if (
    c.includes("how old") || c.includes("your age") ||
    c.includes("mind me asking") || c.includes("old are you") ||
    c.includes("age are you") || c.includes("how old are")
  ) {
    return ["I'm 35 years old", "I'm 45 years old", "I'm 55 years old", "I'm 65 years old"];
  }

  // Location question
  if (
    c.includes("which city") || c.includes("where are you") ||
    c.includes("city in canada") || c.includes("based in") ||
    c.includes("city are you") || (c.includes("located") && !c.includes("trial"))
  ) {
    return ["I live in Toronto", "I live in Vancouver", "I live in Montreal", "I live in Calgary"];
  }

  // Biomarker question
  if (
    c.includes("biomarker") || c.includes("egfr") || c.includes("pd-l1") ||
    c.includes("mutation") || c.includes("genetic") || c.includes("markers")
  ) {
    return ["EGFR positive", "PD-L1 positive", "I don't know", "No biomarkers"];
  }

  // Diagnosis date question
  if (
    c.includes("when were you first") || c.includes("diagnosis date") ||
    c.includes("first diagnosed") || c.includes("how long ago") ||
    c.includes("when did you") || (c.includes("diagnosed") && c.includes("ago"))
  ) {
    return ["About 3 months ago", "About 6 months ago", "About a year ago", "I'd rather not say"];
  }

  // Trial results shown — post-search chips
  if (
    hasAnyTrialResults && (
      c.includes("matching trial") || c.includes("best match") ||
      c.includes("here are") || c.includes("i found") ||
      c.includes("ask me about") || c.includes("trial result")
    )
  ) {
    return ["Find nearest trials", "Show best matches", "Show recruiting trials", "Best and nearest"];
  }

  // Fallback: if we have any trial results in history, show post-search chips
  if (hasAnyTrialResults) {
    return ["Find nearest trials", "Show best matches", "Show recruiting trials", "Best and nearest"];
  }

  return [];
}

// ── Main Component ─────────────────────────────────────────────────────────
const ChatPanel = ({
  userProfile, onTrialsFound, onZoomToLocation,
  onViewSummary, selectedTrialId
}: ChatPanelProps) => {
  const {
    messages, setMessages, setUserProfile, setProfileReady,
    chatService, searchDone, setSearchDone, allFoundTrials, setAllFoundTrials
  } = useAssistant();

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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
    return {
      ...(userProfile || {} as UserProfile),
      ...profileUpdates,
      latitude: coords.latitude,
      longitude: coords.longitude,
      location: `${state.city || ""}, ${state.province || ""}`,
    } as UserProfile;
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

  const handlePostSearchIntent = useCallback((intent: PostSearchIntent, profile: UserProfile) => {
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
      default: return null;
    }
  }, [allFoundTrials]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    try {
      const isNewSearch = detectNewSearchIntent(currentInput);

      // ── Handle post-search intents only if NOT starting a new search ──
      if (searchDone && userProfile && !isNewSearch) {
        const intent = detectPostSearchIntent(currentInput);
        if (intent) {
          const result = handlePostSearchIntent(intent, userProfile);
          if (result) {
            if (onTrialsFound) onTrialsFound(result.trials);
            setMessages((prev) => [...prev, {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: result.message,
              trials: result.trials,
            }]);
            setIsTyping(false);
            return;
          }
        }
      }

      // ── If new search detected, clear old search state before LLM call ──
      if (isNewSearch && searchDone) {
        setSearchDone(false);
        setAllFoundTrials([]);
        if (onTrialsFound) onTrialsFound([]); // clear map pins
      }

      const result = await chatService.sendMessage(currentInput);

      // ── LLM triggered search phrase → run search ──
      if (result.shouldSearch) {
        // Always clear previous results before new search
        setSearchDone(false);
        setAllFoundTrials([]);

        const { found } = performTrialSearch();
        setSearchDone(true);

        if (onTrialsFound) onTrialsFound(found);

        // Show "searching" message
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.response,
        }]);

        // Show results
        const summary = found.length > 0
          ? `I found **${found.length} matching trial${found.length > 1 ? "s" : ""}** for you. Here are your best matches:`
          : "I couldn't find trials matching your exact criteria. Try broadening your search or clicking **Start over**.";

        setMessages((prev) => [...prev, {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: summary,
          trials: found.length > 0 ? found : undefined,
        }]);

      } else {
        // Normal conversational reply
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

        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.response,
        }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I'm having trouble connecting. Please try again.",
      }]);
    }

    setIsTyping(false);
  };

  const handleReset = () => {
    chatService.reset();
    setSearchDone(false);
    setAllFoundTrials([]);
    if (onTrialsFound) onTrialsFound([]);
    setProfileReady(false);
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Hi there! 👋 Let's start fresh. What type of cancer have you been diagnosed with?",
    }]);
  };

  // ── Compute chips dynamically from last assistant message ──────────────
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");
  const lastContent = lastAssistantMsg?.content || "";
  const hasAnyTrialResults = messages.some(m => m.trials && m.trials.length > 0);
  const suggestions = getDynamicSuggestions(lastContent, hasAnyTrialResults && searchDone);

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
          <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            Online
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
                  <div key={trial.trial_id} ref={(el) => { trialCardRefs.current[trial.trial_id] = el; }}>
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

      {/* Input */}
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isTyping && handleSend()}
            placeholder={searchDone ? "Ask about results or try a new cancer type..." : "Tell me about your condition..."}
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

        {/* Dynamic suggestion chips */}
        <div className="flex gap-2 flex-wrap">
          {suggestions.map((s) => (
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
