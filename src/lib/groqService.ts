import { UserProfile } from "@/data/types";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ConversationState {
  cancer_type?: string;
  disease_stage?: string;
  age?: number;
  sex?: string;
  city?: string;
  province?: string;
  biomarkers?: string[];
  diagnosis_date?: string;
  isComplete: boolean;
}

const SYSTEM_PROMPT = `You are a compassionate clinical trial navigator helping patients find trials in Canada. You speak like a warm, professional nurse taking an intake — brief but human.

RULES:
- Ask ONE question at a time
- Keep replies to 1-2 short sentences max
- Add a brief, genuine empathetic touch
- Collect in this order: cancer type → stage → age → location → biomarkers → diagnosis date
- CRITICAL CONFIRMATION STEP:
Once you have required info, show summary and ASK for confirmation
- WAIT for user confirmation before searching
- After confirmation say EXACTLY: "Let me search for matching trials now."
`;

export class GroqChatService {
  private history: ConversationMessage[] = [];
  private state: ConversationState = { isComplete: false };

  // ✅ NEW FLAG
  private awaitingConfirmation: boolean = false;

  constructor() {
    this.history = [{ role: "system", content: SYSTEM_PROMPT }];
  }

  async sendMessage(userMessage: string): Promise<{
    response: string;
    state: ConversationState;
    shouldSearch: boolean;
  }> {
    const userLower = userMessage.toLowerCase();

    // ✅ CHECK USER CONFIRMATION FIRST
    const isUserConfirming =
      this.awaitingConfirmation &&
      (
        userLower.includes("yes") ||
        userLower.includes("correct") ||
        userLower.includes("looks good") ||
        userLower.includes("that's right") ||
        userLower.includes("right")
      );

    this.history.push({ role: "user", content: userMessage });

    // extract info only if not confirming
    if (!isUserConfirming) {
      this.extractInfo(userMessage);
    }

    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: this.history,
          max_tokens: 300,
          temperature: 0.6,
        }),
      });

      if (!res.ok) {
        throw new Error("Groq API error");
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Try again.";

      this.history.push({ role: "assistant", content: reply });

      // ✅ DETECT CONFIRMATION STEP
      if (reply.includes("Does everything look correct?")) {
        this.awaitingConfirmation = true;
      }

      // ✅ ONLY TRIGGER SEARCH AFTER USER CONFIRMS
      let shouldSearch = false;

      if (isUserConfirming && this.state.isComplete) {
        shouldSearch = true;
        this.awaitingConfirmation = false;
      }

      return { response: reply, state: this.state, shouldSearch };

    } catch (error) {
      return {
        response: "Connection issue. Try again.",
        state: this.state,
        shouldSearch: false,
      };
    }
  }

  private extractInfo(msg: string) {
    const lower = msg.toLowerCase();

    // Cancer type
    const cancerTypes = ["lung", "breast", "colon", "prostate"];
    for (const c of cancerTypes) {
      if (lower.includes(c)) {
        this.state.cancer_type = c;
      }
    }

    // Stage
    const stageMatch = lower.match(/stage\s*(\d|i{1,4})/i);
    if (stageMatch) {
      this.state.disease_stage = `Stage ${stageMatch[1]}`;
    }

    // Age
    const ageMatch = lower.match(/\b(\d{2})\b/);
    if (ageMatch) {
      this.state.age = parseInt(ageMatch[1]);
    }

    // Location
    if (lower.includes("montreal")) {
      this.state.city = "Montreal";
      this.state.province = "Quebec";
    }

    // completeness check
    this.state.isComplete = !!(
      this.state.cancer_type &&
      this.state.disease_stage &&
      this.state.age &&
      this.state.city
    );
  }

  getState(): ConversationState {
    return this.state;
  }

  buildUserProfile(): Partial<UserProfile> {
    return {
      cancer_type: this.state.cancer_type,
      disease_stage: this.state.disease_stage,
      age: this.state.age,
      city: this.state.city,
      province: this.state.province,
      biomarkers: this.state.biomarkers,
    };
  }

  reset() {
    this.state = { isComplete: false };
    this.history = [{ role: "system", content: SYSTEM_PROMPT }];
    this.awaitingConfirmation = false;
  }
}
