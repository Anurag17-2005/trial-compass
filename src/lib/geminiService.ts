import { GoogleGenerativeAI } from "@google/generative-ai";
import { UserProfile } from "@/data/types";

// Initialize Gemini API
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

// System prompt for the conversational assistant
const SYSTEM_PROMPT = `You are a compassionate AI assistant helping patients find clinical trials. Your goal is to collect necessary medical information through natural conversation.

IMPORTANT GUIDELINES:
1. Ask ONE question at a time - never overwhelm the patient
2. Be empathetic and supportive in your tone
3. Collect information in this order:
   - Cancer type (e.g., lung, breast, colorectal)
   - Disease stage (e.g., Stage I, II, III, IV)
   - Age
   - Location (city and province/state)
   - Biomarkers (if known, optional)
   - Recent diagnosis date (optional)

4. After each user response, acknowledge their answer warmly before asking the next question
5. If the user provides multiple pieces of information at once, acknowledge all of them
6. Keep responses concise and conversational
7. Once you have enough information, summarize what you've learned and offer to search for trials

RESPONSE FORMAT:
- Use natural, conversational language
- Show empathy (e.g., "I understand this is a difficult time")
- Be encouraging (e.g., "Thank you for sharing that")
- Keep questions simple and clear

SPECIAL COMMANDS:
- If user says "search" or "find trials", indicate you're ready to search
- If user asks "help", explain what information you need
- If user seems confused, offer examples

Remember: You're here to help, not interrogate. Make the conversation feel supportive and natural.`;

export interface ConversationState {
  cancer_type?: string;
  disease_stage?: string;
  age?: number;
  city?: string;
  province?: string;
  biomarkers?: string[];
  diagnosis_date?: string;
  isComplete: boolean;
}

export class GeminiChatService {
  private model;
  private chat;
  private conversationState: ConversationState;

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT
    });
    this.conversationState = { isComplete: false };
    this.chat = this.model.startChat({
      history: [],
    });
  }

  async sendMessage(userMessage: string): Promise<{
    response: string;
    state: ConversationState;
    shouldSearch: boolean;
  }> {
    try {
      // Send message to Gemini
      const result = await this.chat.sendMessage(userMessage);
      const responseText = result.response.text();

      // Extract information from the conversation
      this.updateConversationState(userMessage, responseText);

      // Check if we should trigger a search
      const shouldSearch = this.shouldTriggerSearch(userMessage, responseText);

      return {
        response: responseText,
        state: this.conversationState,
        shouldSearch,
      };
    } catch (error) {
      console.error("Gemini API error:", error);
      return {
        response: "I apologize, but I'm having trouble processing that. Could you please try again?",
        state: this.conversationState,
        shouldSearch: false,
      };
    }
  }

  private updateConversationState(userMessage: string, aiResponse: string) {
    const lower = userMessage.toLowerCase();

    // Extract cancer type
    const cancerTypes = [
      "lung", "breast", "brain", "colorectal", "prostate", "melanoma",
      "ovarian", "lymphoma", "pancreatic", "thyroid", "bladder",
      "kidney", "myeloma", "liver", "sarcoma", "leukemia", "head and neck"
    ];
    for (const cancer of cancerTypes) {
      if (lower.includes(cancer)) {
        this.conversationState.cancer_type = cancer.charAt(0).toUpperCase() + cancer.slice(1);
        break;
      }
    }

    // Extract disease stage - more flexible patterns
    const stageMatch = lower.match(/stage\s*(i{1,4}v?|[1-4]|iv|advanced|early|metastatic)/i);
    if (stageMatch) {
      let stage = stageMatch[1].toUpperCase();
      // Map common terms to stages
      if (stage === "ADVANCED") stage = "IV";
      if (stage === "EARLY") stage = "I";
      if (stage === "METASTATIC") stage = "IV";
      // Convert numbers to Roman numerals
      const numToRoman: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV" };
      stage = numToRoman[stage] || stage;
      this.conversationState.disease_stage = `Stage ${stage}`;
    }

    // Extract age - multiple patterns
    const ageMatch = lower.match(/\b(\d{1,3})\s*(?:years?\s*old|yo|y\/o)\b/i) || 
                     lower.match(/\b(?:i'm|i am|age|aged)\s*(\d{1,3})\b/i) ||
                     lower.match(/\b(\d{2})\s*(?:year|yr)\b/i);
    if (ageMatch) {
      const age = parseInt(ageMatch[1]);
      if (age >= 18 && age <= 120) {
        this.conversationState.age = age;
      }
    }

    // Extract location - cities
    const cities = [
      "toronto", "vancouver", "montreal", "calgary", "edmonton", "ottawa",
      "hamilton", "winnipeg", "halifax", "saskatoon", "victoria", "kingston",
      "london", "moncton", "quebec city", "st. john's", "regina", "kelowna"
    ];
    for (const city of cities) {
      if (lower.includes(city)) {
        this.conversationState.city = city.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        break;
      }
    }

    // Extract province
    const provinces: Record<string, string> = {
      "ontario": "Ontario",
      "quebec": "Quebec",
      "british columbia": "British Columbia",
      "bc": "British Columbia",
      "alberta": "Alberta",
      "manitoba": "Manitoba",
      "saskatchewan": "Saskatchewan",
      "nova scotia": "Nova Scotia",
      "new brunswick": "New Brunswick",
      "newfoundland": "Newfoundland and Labrador",
      "pei": "Prince Edward Island",
      "prince edward island": "Prince Edward Island",
    };
    for (const [key, val] of Object.entries(provinces)) {
      if (lower.includes(key)) {
        this.conversationState.province = val;
        break;
      }
    }

    // Extract biomarkers
    const biomarkerKeywords = ["egfr", "alk", "ros1", "braf", "kras", "pd-l1", "her2", "brca"];
    for (const biomarker of biomarkerKeywords) {
      if (lower.includes(biomarker)) {
        if (!this.conversationState.biomarkers) {
          this.conversationState.biomarkers = [];
        }
        const formatted = biomarker.toUpperCase();
        if (!this.conversationState.biomarkers.includes(formatted)) {
          this.conversationState.biomarkers.push(formatted);
        }
      }
    }

    // Extract diagnosis date
    const monthMatch = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
    if (monthMatch) {
      this.conversationState.diagnosis_date = monthMatch[1];
    }

    // Check if we have minimum required information
    this.conversationState.isComplete = !!(
      this.conversationState.cancer_type &&
      this.conversationState.disease_stage &&
      this.conversationState.age
    );
  }

  private shouldTriggerSearch(userMessage: string, aiResponse: string): boolean {
    // Auto-trigger search whenever we have enough info collected
    if (this.conversationState.isComplete) {
      return true;
    }
    return false;
  }

  getConversationState(): ConversationState {
    return this.conversationState;
  }

  isReadyToSearch(): boolean {
    return this.conversationState.isComplete;
  }

  buildUserProfile(baseProfile: UserProfile): Partial<UserProfile> {
    const updates: Partial<UserProfile> = {};

    if (this.conversationState.cancer_type) {
      updates.cancer_type = this.conversationState.cancer_type;
    }
    if (this.conversationState.disease_stage) {
      updates.disease_stage = this.conversationState.disease_stage;
    }
    if (this.conversationState.age) {
      updates.age = this.conversationState.age;
    }
    if (this.conversationState.city) {
      updates.city = this.conversationState.city;
    }
    if (this.conversationState.province) {
      updates.province = this.conversationState.province;
    }
    if (this.conversationState.biomarkers) {
      updates.biomarkers = this.conversationState.biomarkers;
    }

    return updates;
  }

  reset() {
    this.conversationState = { isComplete: false };
    this.chat = this.model.startChat({
      history: [],
    });
  }

  // Analyze trials and provide recommendations using Gemini
  async analyzeTrials(trials: any[], userProfile: any): Promise<string> {
    try {
      const analysisModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
      });

      const trialsInfo = trials.map((trial, index) => `
Trial ${index + 1}: ${trial.title}
- Hospital: ${trial.hospital}, ${trial.city}
- Distance: ${trial.distance?.toFixed(1) || 'N/A'} km
- Treatment: ${trial.treatment_type}
- Phase: ${trial.phase}
- Status: ${trial.recruitment_status}
- Disease Stage: ${trial.disease_stage}
- Biomarkers: ${trial.biomarkers?.join(', ') || 'None'}
- Match Score: ${trial.suitabilityScore || trial.combinedScore || 'N/A'}%
- Inclusion Criteria: ${trial.inclusion_criteria?.slice(0, 3).join('; ') || 'N/A'}
`).join('\n---\n');

      const prompt = `You are a compassionate clinical trial advisor. Analyze these ${trials.length} clinical trials for a patient and provide a warm, helpful recommendation.

PATIENT PROFILE:
- Cancer Type: ${userProfile.cancer_type}
- Stage: ${userProfile.disease_stage}
- Age: ${userProfile.age}
- Location: ${userProfile.city}, ${userProfile.province}
${userProfile.biomarkers?.length > 0 ? `- Biomarkers: ${userProfile.biomarkers.join(', ')}` : ''}

AVAILABLE TRIALS:
${trialsInfo}

Please provide:
1. A brief, empathetic introduction (1-2 sentences)
2. Identify the TOP 2-3 BEST trials for this patient and explain WHY they're good matches
3. Mention any important considerations (distance, biomarkers, phase)
4. End with an encouraging note

Keep your response conversational, warm, and under 300 words. Focus on helping the patient understand which trials are most suitable and why.`;

      const result = await analysisModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Trial analysis error:", error);
      return "I've found several trials that match your profile. The trials are ranked by how well they match your condition and how close they are to you. I recommend reviewing the top matches first.";
    }
  }
}
