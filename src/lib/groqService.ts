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

const SYSTEM_PROMPT = `You are a compassionate clinical trial navigator helping patients find trials in Canada. You speak like a warm, professional nurse — brief, human, and clear.

## STRICT COLLECTION ORDER (follow exactly, one question at a time):
1. Cancer type
2. Disease stage
3. Age
4. Location (city + province)
5. Biomarkers — if user says "no", "don't know", "skip", "none" → set to "Not specified" and move on
6. Diagnosis date — ask "When were you first diagnosed? You can say something like 'about 6 months ago' or give a year — or skip if you'd prefer."
   If user skips → set to "Not specified" and move on
7. CONFIRMATION TABLE — once you have cancer type + stage + age + location, show this EXACT format:

---
Here's a summary of your details:

| Detail | Value |
|---|---|
| Cancer Type | [value] |
| Stage | [value] |
| Age | [value] |
| Location | [city, province] |
| Biomarkers | [value or Not specified] |
| Diagnosis Date | [value or Not specified] |

Does everything look correct? I'll find your matching trials once you confirm. ✓
---

8. WAIT for user to confirm (yes / looks good / correct / that's right / proceed)
9. Only after confirmed, reply EXACTLY with this phrase and nothing else:
   "Perfect! Let me search for matching trials now. 🔍"

## CRITICAL RULES:
- Ask ONLY ONE question per message
- Do NOT skip step 6 (diagnosis date) — it must be asked after biomarkers
- Do NOT show the confirmation table until BOTH biomarkers AND diagnosis date have been answered (or skipped)
- Do NOT include the phrase "search for matching trials" anywhere except step 9
- Do NOT proceed to search unless user explicitly confirms the table
- If user wants to change something after the table, ask what to change, update it, show the table again
- Never give medical advice — only help find trials

## TONE EXAMPLES:
- "I'm sorry to hear that. What stage has your oncologist identified?"
- "Got it, stage III. How old are you, if you don't mind?"
- "Thank you. Which city in Canada are you located in?"
- "Do you know any of your biomarkers, like EGFR or PD-L1? It's fine to skip this."
- "One last question — when were you first diagnosed? You can say something like 'about a year ago', give a year, or skip."`;


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
          max_tokens: 400,
          temperature: 0.5,
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

      // Extract diagnosis date from assistant reply context if assistant acknowledges it
      this.extractDiagnosisDateFromContext(userMessage);

      // VERY specific trigger — only this exact phrase fires the search
      const shouldSearch =
        reply.includes("Let me search for matching trials now") ||
        reply.includes("search for matching trials now");

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

  private extractDiagnosisDateFromContext(msg: string) {
    const lower = msg.toLowerCase();

    // Skip phrases
    const skipPhrases = ["skip", "don't know", "not sure", "rather not", "prefer not", "no idea", "unsure"];
    if (skipPhrases.some(p => lower.includes(p))) {
      if (!this.state.diagnosis_date) {
        this.state.diagnosis_date = "Not specified";
      }
      return;
    }

    // Year patterns: "2022", "in 2023", "since 2021"
    const yearMatch = lower.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearMatch) {
      this.state.diagnosis_date = yearMatch[1];
      return;
    }

    // Relative patterns: "6 months ago", "a year ago", "last year", "recently"
    const relativePatterns = [
      /(\d+)\s*months?\s*ago/i,
      /(\d+)\s*years?\s*ago/i,
      /about\s+(\d+)\s*(months?|years?)/i,
      /(last\s+year|recently|just\s+diagnosed|this\s+year)/i,
      /(a\s+few\s+months|a\s+few\s+years)/i,
    ];
    for (const pattern of relativePatterns) {
      const match = lower.match(pattern);
      if (match) {
        this.state.diagnosis_date = match[0];
        return;
      }
    }

    // Month + year: "January 2023", "March last year"
    const monthMatch = lower.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s*(20\d{2})?/i);
    if (monthMatch) {
      this.state.diagnosis_date = monthMatch[0];
      return;
    }
  }

  private extractInfo(msg: string) {
    const lower = msg.toLowerCase();

    // Detect change intent — clear the relevant field
    if (lower.includes("change") || lower.includes("update") || lower.includes("correct")) {
      if (lower.includes("stage")) this.state.disease_stage = undefined;
      if (lower.includes("age")) this.state.age = undefined;
      if (lower.includes("cancer") || lower.includes("type")) this.state.cancer_type = undefined;
      if (lower.includes("city") || lower.includes("location")) {
        this.state.city = undefined;
        this.state.province = undefined;
      }
      if (lower.includes("biomarker")) this.state.biomarkers = undefined;
      if (lower.includes("diagnosis") || lower.includes("date") || lower.includes("diagnosed")) {
        this.state.diagnosis_date = undefined;
      }
      this.state.isComplete = false;
      return;
    }

    // Cancer type
    const cancerTypes = [
      "lung", "breast", "brain", "colorectal", "colon", "prostate", "melanoma",
      "ovarian", "lymphoma", "pancreatic", "thyroid", "bladder",
      "kidney", "myeloma", "liver", "sarcoma", "leukemia", "head and neck",
      "gastric", "stomach", "cervical", "endometrial", "biliary", "mesothelioma"
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
    if (!this.state.disease_stage) {
      if (lower.includes("advanced")) this.state.disease_stage = "Stage IV";
      if (lower.includes("metastatic")) this.state.disease_stage = "Stage IV";
      if (lower.includes("early stage") || lower.includes("early-stage")) this.state.disease_stage = "Stage I";
    }

    // Age
    const ageMatch =
      lower.match(/\b(\d{1,3})\s*(?:years?\s*old|yo|y\/o)\b/i) ||
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
      "mississauga": { city: "Mississauga", province: "Ontario" },
      "brampton": { city: "Brampton", province: "Ontario" },
      "surrey": { city: "Surrey", province: "British Columbia" },
    };
    for (const [key, val] of Object.entries(cityMap)) {
      if (lower.includes(key)) {
        this.state.city = val.city;
        if (!this.state.province) this.state.province = val.province;
        break;
      }
    }

    // Province
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

    // Biomarkers — handle "no" / "none" / "skip" etc.
    const noBiomarkers = ["no biomarkers", "no biomarker", "don't know", "skip", "none", "not sure", "no idea", "i don't have"];
    if (noBiomarkers.some(p => lower.includes(p))) {
      if (!this.state.biomarkers) this.state.biomarkers = [];
    } else {
      const biomarkerKeywords = ["egfr", "alk", "ros1", "braf", "kras", "pd-l1", "her2", "brca", "btk", "bcl-2", "mss", "msi", "folr1", "ret", "fgfr", "ntrk", "met", "lag-3"];
      for (const b of biomarkerKeywords) {
        if (lower.includes(b)) {
          if (!this.state.biomarkers) this.state.biomarkers = [];
          const formatted = b.toUpperCase();
          if (!this.state.biomarkers.includes(formatted)) this.state.biomarkers.push(formatted);
        }
      }
    }

    // Diagnosis date extraction
    this.extractDiagnosisDateFromContext(msg);

    // isComplete is NOT used to trigger search anymore — only the LLM phrase does
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
      "Mississauga": { latitude: 43.5890, longitude: -79.6441 },
      "Surrey": { latitude: 49.1913, longitude: -122.8490 },
    };
    if (this.state.city && coords[this.state.city]) return coords[this.state.city];
    return { latitude: 56.1304, longitude: -106.3468 };
  }

  reset() {
    this.state = { isComplete: false };
    this.history = [{ role: "system", content: SYSTEM_PROMPT }];
  }
}
