import { useState, useRef, useEffect } from "react";
import { ChatMessage, Trial, UserProfile } from "@/data/types";
import { trials } from "@/data/trials";
import { getRankedByBoth, calculateTrialSuitability, calculateDistance } from "@/lib/trialMatching";
import { useAssistant } from "@/contexts/AssistantContext";
import TrialResultCard from "./TrialResultCard";
import { GroqChatService } from "@/lib/groqService";
import ReactMarkdown from "react-markdown";
import { Send, RotateCcw } from "lucide-react";

interface ChatPanelProps {
  userProfile?: UserProfile;
  onTrialsFound?: (trials: Trial[]) => void;
  onZoomToLocation?: (trial: Trial) => void;
  onViewTrialDetails?: (trial: Trial) => void;
  onViewSummary?: (trial: Trial) => void;
  selectedTrialId?: string | null;
}

const ChatPanel = ({ 
  userProfile, onTrialsFound, onZoomToLocation, onViewTrialDetails, 
  onViewSummary, selectedTrialId 
}: ChatPanelProps) => {
  const { messages, setMessages, setUserProfile, setProfileReady } = useAssistant();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatService] = useState(() => new GroqChatService());
  const [searchDone, setSearchDone] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const trialCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && !lastMsg.trials) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Scroll to trial card when selected from map
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

  const performTrialSearch = (state: ReturnType<GroqChatService["getState"]>) => {
    let found: Trial[] = trials.filter((t) => {
      if (state.cancer_type && !t.cancer_type.toLowerCase().includes(state.cancer_type.toLowerCase())) return false;
      if (state.city && !t.city.toLowerCase().includes(state.city.toLowerCase())) return false;
      if (state.province && t.province !== state.province) return false;
      if (state.disease_stage) {
        const stageNum = state.disease_stage.match(/[IViv]+$/)?.[0];
        if (stageNum && !t.disease_stage.toUpperCase().includes(stageNum.toUpperCase())) return false;
      }
      return true;
    });

    // If strict filter returns nothing, try just cancer type
    if (found.length === 0 && state.cancer_type) {
      found = trials.filter(t => t.cancer_type.toLowerCase().includes(state.cancer_type!.toLowerCase()));
    }

    // Update user profile with coordinates
    const coords = chatService.getCityCoordinates();
    const profileUpdates = chatService.buildUserProfile();
    const updatedProfile: UserProfile = {
      ...userProfile!,
      ...profileUpdates,
      latitude: coords.latitude,
      longitude: coords.longitude,
      location: `${state.city || ""}, ${state.province || ""}`,
    };
    setUserProfile(updatedProfile);
    setProfileReady(true);

    // Rank trials using updated profile
    if (found.length > 0) {
      found = getRankedByBoth(found, updatedProfile).slice(0, 8);
    }

    return found;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    try {
      const result = await chatService.sendMessage(currentInput);

      if (result.shouldSearch && !searchDone) {
        const found = performTrialSearch(result.state);
        setSearchDone(true);

        if (onTrialsFound) onTrialsFound(found);

        const summary = found.length > 0
          ? `I found **${found.length} matching trial${found.length > 1 ? "s"  : ""}** for you. Here are your best matches:`
          : "I couldn't find trials matching your exact criteria. Try broadening your search.";

        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: summary,
          trials: found.length > 0 ? found : undefined,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        // Regular conversational response
        // Update profile progressively
        if (userProfile) {
          const profileUpdates = chatService.buildUserProfile();
          if (Object.keys(profileUpdates).length > 0) {
            const coords = chatService.getCityCoordinates();
            setUserProfile({ ...userProfile, ...profileUpdates, latitude: coords.latitude, longitude: coords.longitude });
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
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Hi there! 👋 Let's start fresh. What type of cancer have you been diagnosed with?",
    }]);
  };

  // Dynamic suggestion chips based on conversation state
  const getSuggestions = (): string[] => {
    const state = chatService.getState();
    if (searchDone) {
      return ["Find nearest trials", "Show best matches", "Start a new search"];
    }
    if (!state.cancer_type) {
      return ["I have lung cancer", "I have breast cancer", "I have colorectal cancer"];
    }
    if (!state.disease_stage) {
      return ["Stage 1", "Stage 2", "Stage 3", "Stage 4"];
    }
    if (!state.age) {
      return ["I'm 45 years old", "I'm 55 years old", "I'm 65 years old"];
    }
    if (!state.city) {
      return ["I live in Toronto", "I live in Vancouver", "I live in Montreal"];
    }
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
                  <div className="text-sm prose prose-sm max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
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
              <div className="flex gap-1">
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
              onClick={() => {
                if (s === "Start a new search") {
                  handleReset();
                } else {
                  setInput(s);
                }
              }}
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
