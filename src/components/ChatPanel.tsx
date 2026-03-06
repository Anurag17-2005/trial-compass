import { useState, useRef, useEffect } from "react";
import { ChatMessage, Trial } from "@/data/types";
import { trials } from "@/data/trials";

interface ChatPanelProps {
  onTrialsFound?: (trials: Trial[]) => void;
}

function extractIntent(message: string) {
  const lower = message.toLowerCase();
  const result: { cancer_type?: string; stage?: string; city?: string; province?: string } = {};

  const cancerKeywords = [
    "lung", "breast", "brain", "colorectal", "prostate", "melanoma",
    "ovarian", "lymphoma", "pancreatic", "thyroid", "bladder",
    "kidney", "myeloma", "liver", "sarcoma", "leukemia", "head and neck"
  ];
  for (const c of cancerKeywords) {
    if (lower.includes(c)) {
      result.cancer_type = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  const stageMatch = lower.match(/stage\s*(i{1,4}v?|[1-4]|ii[i]?|iv)/i);
  if (stageMatch) result.stage = stageMatch[1].toUpperCase();

  const cityKeywords = [
    "toronto", "vancouver", "montreal", "calgary", "edmonton", "ottawa",
    "hamilton", "winnipeg", "halifax", "saskatoon", "victoria", "kingston",
    "london", "moncton", "quebec city", "st. john's"
  ];
  for (const city of cityKeywords) {
    if (lower.includes(city)) {
      result.city = city.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      break;
    }
  }

  const provinceKeywords: Record<string, string> = {
    ontario: "Ontario",
    quebec: "Quebec",
    "british columbia": "British Columbia",
    alberta: "Alberta",
    manitoba: "Manitoba",
    saskatchewan: "Saskatchewan",
    "nova scotia": "Nova Scotia",
    "new brunswick": "New Brunswick",
    "newfoundland": "Newfoundland and Labrador",
  };
  for (const [key, val] of Object.entries(provinceKeywords)) {
    if (lower.includes(key)) {
      result.province = val;
      break;
    }
  }

  return result;
}

function searchTrials(intent: ReturnType<typeof extractIntent>) {
  return trials.filter((t) => {
    if (intent.cancer_type && !t.cancer_type.toLowerCase().includes(intent.cancer_type.toLowerCase())) return false;
    if (intent.city && !t.city.toLowerCase().includes(intent.city.toLowerCase())) return false;
    if (intent.province && t.province !== intent.province) return false;
    if (intent.stage) {
      const romanMap: Record<string, string[]> = {
        "I": ["I", "1"], "II": ["II", "2"], "III": ["III", "3"], "IV": ["IV", "4"],
      };
      const matchStage = romanMap[intent.stage] || [intent.stage];
      if (!matchStage.some(s => t.disease_stage.includes(s))) return false;
    }
    return true;
  });
}

function generateResponse(message: string, found: Trial[]): string {
  const lower = message.toLowerCase();

  if (lower.includes("hello") || lower.includes("hi") || lower === "hey") {
    return "Hello! I'm your AI Trial Assistant. I can help you find clinical trials based on your condition, location, and preferences. Tell me about your cancer type, stage, or location and I'll find matching trials for you.";
  }

  if (lower.includes("help") || lower.includes("what can you do")) {
    return "I can help you with:\n\n• **Find trials** — Tell me your cancer type, stage, or location\n• **Explain a trial** — Ask me to explain any trial in simple terms\n• **Check eligibility** — Describe your situation and I'll check criteria\n• **Compare trials** — I can compare multiple trials for you\n• **Locate centres** — Find trials near your city or province";
  }

  if (found.length === 0) {
    return "I couldn't find any trials matching your criteria. Try being more specific or adjusting your search. You can mention a cancer type (e.g., lung, breast), a stage (e.g., stage 2), or a location (e.g., Toronto, Ontario).";
  }

  let response = `I found **${found.length} trial${found.length > 1 ? "s" : ""}** that may match your criteria:\n\n`;
  found.slice(0, 5).forEach((t, i) => {
    response += `**${i + 1}. ${t.title}**\n`;
    response += `• Status: ${t.recruitment_status}\n`;
    response += `• Location: ${t.hospital}, ${t.city}\n`;
    response += `• Treatment: ${t.treatment_type}\n`;
    if (t.biomarkers.length > 0) response += `• Biomarkers: ${t.biomarkers.join(", ")}\n`;
    response += `\n`;
  });

  if (found.length > 5) {
    response += `...and ${found.length - 5} more. The map shows all matching trial centres.`;
  }

  response += "\nWould you like me to explain any of these trials in detail or check your eligibility?";
  return response;
}

const ChatPanel = ({ onTrialsFound }: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your AI Trial Assistant. Tell me about your condition, and I'll help you find relevant clinical trials across Canada. You can mention your cancer type, stage, or location.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const intent = extractIntent(input);
      const found = searchTrials(intent);
      const response = generateResponse(input, found);

      if (onTrialsFound && found.length > 0) onTrialsFound(found);

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: response, trials: found },
      ]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-bold text-foreground">AI Trial Assistant</h2>
        <p className="text-xs text-muted-foreground">Describe your condition to find matching trials</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
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

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Describe your condition..."
            className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            Send
          </button>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {["I have lung cancer", "Trials in Toronto", "Stage 2 breast cancer"].map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
