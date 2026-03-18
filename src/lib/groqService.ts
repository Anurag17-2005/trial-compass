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

const SYSTEM_PROMPT = `You are a compassionate AI assistant helping patients find clinical trials in Canada. Collect medical info through natural conversation.

RULES:
- Ask ONE question at a time
- Be warm but VERY concise — max 2-3 short sentences per reply
- Collect in order: cancer type → stage → age → location (city, province) → biomarkers (optional)
- After each answer, briefly acknowledge then ask the next question
- If user says "no" or "don't know" for biomarkers, skip it
- Once you have cancer type + stage + age + location , then summerize and if user says yes  say exactly: "Let me search for matching trials now." and nothing else after that
- Never give medical advice. You help find trials only.
- If user asks off-topic questions, gently redirect to trial search
- If user wants to change previously given info, acknowledge and update

LOCATION HANDLING:
- Accept Canadian cities and provinces
- If user gives city, infer province if obvious (e.g., Toronto → Ontario)
- If unsure, ask for province

EXAMPLES OF CONCISE REPLIES:
- "Thank you. What stage is your cancer?"
- "Got it, stage 3. How old are you?"
- "Thanks! Which city in Canada are you located in?"
- "Let me search for matching trials now."`;

export class GroqChatService {
  private history: ConversationMessage[] = [];
  private state: ConversationState = { isComplete: false };

  constructor() {
    this.history = [{ role: "system", content: SYSTEM_PROMPT }];
  }

  async sendMessage(userMessage: string): Promise<{
    response: string;
    state: ConversationState;
    shouldSearch: boolean;
  }> {
    this.history.push({ role: "user", content: userMessage });
    this.extractInfo(userMessage);

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
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Groq API error:", res.status, errText);
        throw new Error(`Groq API error: ${res.status}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Could you try again?";
      
      this.history.push({ role: "assistant", content: reply });

      // Check if the AI said to search
      const shouldSearch = this.state.isComplete || 
        reply.toLowerCase().includes("search for matching trials") ||
        reply.toLowerCase().includes("let me search");

      return { response: reply, state: this.state, shouldSearch };
    } catch (error) {
      console.error("Groq error:", error);
      return {
        response: "I'm having a brief connection issue. Could you try sending that again?",
        state: this.state,
        shouldSearch: false,
      };
    }
  }

  private extractInfo(msg: string) {
    const lower = msg.toLowerCase();

    // Cancer type
    const cancerTypes = [
      "lung", "breast", "brain", "colorectal", "colon", "prostate", "melanoma",
      "ovarian", "lymphoma", "pancreatic", "thyroid", "bladder",
      "kidney", "myeloma", "liver", "sarcoma", "leukemia", "head and neck"
    ];
    for (const c of cancerTypes) {
      if (lower.includes(c)) {
        this.state.cancer_type = c === "colon" ? "Colorectal" : c.charAt(0).toUpperCase() + c.slice(1);
        break;
      }
    }

    // Stage
    const stageMatch = lower.match(/stage\s*(i{1,4}v?|[1-4]|iv|advanced|early|metastatic)/i);
    if (stageMatch) {
      let s = stageMatch[1].toUpperCase();
      if (s === "ADVANCED" || s === "METASTATIC") s = "IV";
      if (s === "EARLY") s = "I";
      const map: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV" };
      s = map[s] || s;
      this.state.disease_stage = `Stage ${s}`;
    }
    // Also match "advanced" without "stage" prefix
    if (!this.state.disease_stage) {
      if (lower.includes("advanced")) this.state.disease_stage = "Stage IV";
      if (lower.includes("metastatic")) this.state.disease_stage = "Stage IV";
      if (lower.includes("early stage") || lower.includes("early-stage")) this.state.disease_stage = "Stage I";
    }

    // Age
    const ageMatch = lower.match(/\b(\d{1,3})\s*(?:years?\s*old|yo|y\/o)\b/i) ||
      lower.match(/\b(?:i'm|i am|age|aged)\s*(\d{1,3})\b/i) ||
      lower.match(/\b(\d{2})\s*(?:year|yr)\b/i);
    if (ageMatch) {
      const age = parseInt(ageMatch[1]);
      if (age >= 18 && age <= 120) this.state.age = age;
    }

    // Sex
    if (lower.includes("male") || lower.includes(" man") || lower.includes("i'm a man")) this.state.sex = "Male";
    if (lower.includes("female") || lower.includes("woman") || lower.includes("i'm a woman")) this.state.sex = "Female";

    // City
    const cityMap: Record<string, { city: string; province: string }> = {
      "toronto": { city: "Toronto", province: "Ontario" },
      "vancouver": { city: "Vancouver", province: "British Columbia" },
      "montreal": { city: "Montreal", province: "Quebec" },
      "calgary": { city: "Calgary", province: "Alberta" },
      "edmonton": { city: "Edmonton", province: "Alberta" },
      "ottawa": { city: "Ottawa", province: "Ontario" },
      "hamilton": { city: "Hamilton", province: "Ontario" },
      "winnipeg": { city: "Winnipeg", province: "Manitoba" },
      "halifax": { city: "Halifax", province: "Nova Scotia" },
      "saskatoon": { city: "Saskatoon", province: "Saskatchewan" },
      "victoria": { city: "Victoria", province: "British Columbia" },
      "kingston": { city: "Kingston", province: "Ontario" },
      "london": { city: "London", province: "Ontario" },
      "moncton": { city: "Moncton", province: "New Brunswick" },
      "quebec city": { city: "Quebec City", province: "Quebec" },
      "st. john's": { city: "St. John's", province: "Newfoundland and Labrador" },
      "regina": { city: "Regina", province: "Saskatchewan" },
      "kelowna": { city: "Kelowna", province: "British Columbia" },
    };
    for (const [key, val] of Object.entries(cityMap)) {
      if (lower.includes(key)) {
        this.state.city = val.city;
        if (!this.state.province) this.state.province = val.province;
        break;
      }
    }

    // Province (explicit)
    const provinces: Record<string, string> = {
      "ontario": "Ontario", "quebec": "Quebec", "british columbia": "British Columbia",
      "bc": "British Columbia", "alberta": "Alberta", "manitoba": "Manitoba",
      "saskatchewan": "Saskatchewan", "nova scotia": "Nova Scotia",
      "new brunswick": "New Brunswick", "newfoundland": "Newfoundland and Labrador",
      "pei": "Prince Edward Island", "prince edward island": "Prince Edward Island",
    };
    for (const [key, val] of Object.entries(provinces)) {
      if (lower.includes(key)) {
        this.state.province = val;
        break;
      }
    }

    // Biomarkers
    const biomarkerKeywords = ["egfr", "alk", "ros1", "braf", "kras", "pd-l1", "her2", "brca", "btk", "bcl-2"];
    for (const b of biomarkerKeywords) {
      if (lower.includes(b)) {
        if (!this.state.biomarkers) this.state.biomarkers = [];
        const formatted = b.toUpperCase();
        if (!this.state.biomarkers.includes(formatted)) this.state.biomarkers.push(formatted);
      }
    }

    // Check completeness
    this.state.isComplete = !!(
      this.state.cancer_type &&
      this.state.disease_stage &&
      this.state.age &&
      (this.state.city || this.state.province)
    );
  }

  getState(): ConversationState { return this.state; }

  buildUserProfile(): Partial<UserProfile> {
    const updates: Partial<UserProfile> = {};
    if (this.state.cancer_type) updates.cancer_type = this.state.cancer_type;
    if (this.state.disease_stage) updates.disease_stage = this.state.disease_stage;
    if (this.state.age) updates.age = this.state.age;
    if (this.state.city) updates.city = this.state.city;
    if (this.state.province) updates.province = this.state.province;
    if (this.state.biomarkers) updates.biomarkers = this.state.biomarkers;
    return updates;
  }

  // Get coordinates for a city
  getCityCoordinates(): { latitude: number; longitude: number } {
    const coords: Record<string, { latitude: number; longitude: number }> = {
      "Toronto": { latitude: 43.6532, longitude: -79.3832 },
      "Vancouver": { latitude: 49.2827, longitude: -123.1207 },
      "Montreal": { latitude: 45.5017, longitude: -73.5673 },
      "Calgary": { latitude: 51.0447, longitude: -114.0719 },
      "Edmonton": { latitude: 53.5461, longitude: -113.4938 },
      "Ottawa": { latitude: 45.4215, longitude: -75.6972 },
      "Hamilton": { latitude: 43.2557, longitude: -79.8711 },
      "Winnipeg": { latitude: 49.8951, longitude: -97.1384 },
      "Halifax": { latitude: 44.6488, longitude: -63.5752 },
      "Saskatoon": { latitude: 52.1332, longitude: -106.6700 },
      "Victoria": { latitude: 48.4284, longitude: -123.3656 },
      "Kingston": { latitude: 44.2312, longitude: -76.4860 },
      "London": { latitude: 42.9849, longitude: -81.2453 },
      "Moncton": { latitude: 46.0878, longitude: -64.7782 },
      "Quebec City": { latitude: 46.8139, longitude: -71.2080 },
      "St. John's": { latitude: 47.5615, longitude: -52.7126 },
      "Regina": { latitude: 50.4452, longitude: -104.6189 },
      "Kelowna": { latitude: 49.8880, longitude: -119.4960 },
    };
    if (this.state.city && coords[this.state.city]) return coords[this.state.city];
    // Default to center of Canada
    return { latitude: 56.1304, longitude: -106.3468 };
  }

  reset() {
    this.state = { isComplete: false };
    this.history = [{ role: "system", content: SYSTEM_PROMPT }];
  }
}
