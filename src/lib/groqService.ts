import { UserProfile } from "@/data/types";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_API_KEY_BACKUP = import.meta.env.VITE_GROQ_API_KEY_BACKUP || "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const CHAT_MODEL = "llama-3.3-70b-versatile";

const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 0.82;

// Track which API key is currently active
let currentApiKey = GROQ_API_KEY;
let isUsingBackup = false;

// Function to get the current API key
function getApiKey(): string {
  return currentApiKey;
}

// Function to switch to backup key
function switchToBackupKey(): boolean {
  if (!isUsingBackup && GROQ_API_KEY_BACKUP) {
    console.log("Switching to backup API key due to rate limit");
    currentApiKey = GROQ_API_KEY_BACKUP;
    isUsingBackup = true;
    return true;
  }
  return false;
}

// Function to reset to primary key (call this periodically or after cooldown)
export function resetToPrimaryKey(): void {
  if (isUsingBackup && GROQ_API_KEY) {
    console.log("Resetting to primary API key");
    currentApiKey = GROQ_API_KEY;
    isUsingBackup = false;
  }
}

// Get current key status for debugging
export function getKeyStatus(): { isUsingBackup: boolean; hasBackup: boolean } {
  return {
    isUsingBackup,
    hasBackup: !!GROQ_API_KEY_BACKUP
  };
}

// Health check function to verify Groq API is responding
export async function checkGroqHealth(): Promise<boolean> {
  // Simple check: verify API key exists and is properly formatted
  const apiKey = getApiKey();
  if (!apiKey || apiKey.length < 20) {
    return false;
  }
  
  try {
    // Just check if we can reach the API endpoint with a HEAD request
    // This doesn't consume tokens
    const response = await fetch(GROQ_URL, {
      method: "HEAD",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    // If we get any response (even 405 Method Not Allowed), the API is reachable
    return response.status !== 0;
  } catch (error) {
    console.error("Groq health check failed:", error);
    return false;
  }
}

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
  patient_name?: string;
  isComplete: boolean;
}

const SYSTEM_PROMPT = `You are a clinical trial assistant helping patients find relevant cancer clinical trials in Canada.

Your role is to:
1. Collect patient information conversationally
2. Never assume or guess medical details
3. Ask ONE question at a time
4. Use simple, patient-friendly language (avoid medical jargon unless explaining it)
5. Be empathetic, clear, and concise

---

## CORE BEHAVIOR RULES

- NEVER hallucinate or invent any patient information
- ONLY use information explicitly provided by the user
- If something is unknown, ask for it
- If the user says "I don't know", "not sure", or "skip", accept it and continue
- NEVER force the user to answer anything
- NEVER provide medical advice
- ONLY assist with finding clinical trials

---

## INFORMATION COLLECTION FLOW (STRICT ORDER)

Ask for ONE field at a time in this order:

1. Cancer type  
   (If unclear, ask: "Do you know what type of cancer it is?")

2. Disease stage  
   (If user says "advanced" or "metastatic", interpret as Stage IV but DO NOT state this unless confirming)

3. Age  

4. Location (City + Province in Canada)

5. Biomarkers  
   - If user says "no", "don't know", "skip" → set as "Not specified"

6. Diagnosis date  
   Ask:
   "When were you first diagnosed? You can say something like '6 months ago', a year, or skip."

---

## CONVERSATIONAL STYLE

- Ask ONE question at a time
- Keep responses short (1–2 lines)
- Be natural and human-like

Examples:
- "I'm sorry you're going through this. What type of cancer have you been diagnosed with?"
- "Thanks. Do you know the stage, or what your doctor has told you about it?"
- "Got it. How old are you, if you don't mind sharing?"

---

## DYNAMIC STATE HANDLING

- Build a mental patient profile gradually
- After EACH new piece of info:
  - silently update internal state
  - continue asking next missing field

- While collecting info:
  - DO NOT summarize yet
  - DO NOT search yet

---

## CONFIRMATION STEP (VERY IMPORTANT)

ONLY after collecting:
- cancer type
- stage
- age
- location
- biomarkers
- diagnosis date

Then show EXACTLY this format:

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

Does everything look correct?
---

WAIT for confirmation.

---

## AFTER CONFIRMATION

ONLY after user confirms:

Reply EXACTLY:

"Perfect! Let me search for matching trials now. 🔍"

Do not add anything else.

---

## DURING CONVERSATION (IMPORTANT FOR MAP INTEGRATION)

While collecting data, occasionally give progress updates like:

"Based on what you've shared so far, I'm starting to find some possible trials for you."

BUT:
- Do NOT show results yet
- Do NOT finalize until confirmation

---

## EDGE CASE HANDLING

- If user gives multiple details at once → extract all but STILL ask next missing field only
- If user corrects something → update and continue
- If user asks unrelated questions → gently redirect:
  "I can help you find clinical trials. Let’s continue with a few details first."

---

## TONE

- Supportive, calm, non-clinical
- Never robotic
- Never overly technical
// ── Geocode a city/province string to real lat/lng via Nominatim ──────────
// Cache results to avoid repeated API calls for the same city
const geocodeCache: Record<string, { latitude: number; longitude: number }> = {};

export async function geocodeCity(city: string, province?: string): Promise<{ latitude: number; longitude: number }> {
  const query = province ? `${city}, ${province}, Canada` : `${city}, Canada`;
  const cacheKey = query.toLowerCase();

  if (geocodeCache[cacheKey]) return geocodeCache[cacheKey];

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ca`;
    const res = await fetch(url, {
      headers: { "User-Agent": "CancerTrialsCanada/1.0" },
    });

    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

    const data = await res.json();
    if (data && data.length > 0) {
      const coords = {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
      geocodeCache[cacheKey] = coords;
      console.log(`Geocoded "${query}" → ${coords.latitude}, ${coords.longitude}`);
      return coords;
    }
  } catch (err) {
    console.warn("Geocoding failed, falling back to defaults:", err);
  }

  // Fallback to known coords if geocoding fails
  return getFallbackCoords(city);
}

// Fallback hardcoded coords — only used if Nominatim is unreachable
function getFallbackCoords(city: string): { latitude: number; longitude: number } {
  const fallback: Record<string, { latitude: number; longitude: number }> = {
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
    "Burnaby": { latitude: 49.2488, longitude: -122.9805 },
    "Richmond": { latitude: 49.1666, longitude: -123.1336 },
    "Abbotsford": { latitude: 49.0504, longitude: -122.3045 },
    "Barrie": { latitude: 44.3894, longitude: -79.6903 },
    "Sudbury": { latitude: 46.4917, longitude: -80.9930 },
    "Thunder Bay": { latitude: 48.3809, longitude: -89.2477 },
    "Lethbridge": { latitude: 49.6956, longitude: -112.8451 },
    "Red Deer": { latitude: 52.2681, longitude: -113.8112 },
    "Sherbrooke": { latitude: 45.4042, longitude: -71.8929 },
    "Saguenay": { latitude: 48.4280, longitude: -71.0545 },
  };
  return fallback[city] || { latitude: 56.1304, longitude: -106.3468 }; // Canada center
}

// ── Compress image using Canvas ────────────────────────────────────────────
async function compressImageToBase64(imageSource: HTMLImageElement | HTMLCanvasElement): Promise<string> {
  const canvas = document.createElement("canvas");
  const isImg = imageSource instanceof HTMLImageElement;
  const srcWidth = isImg ? imageSource.naturalWidth : (imageSource as HTMLCanvasElement).width;
  const srcHeight = isImg ? imageSource.naturalHeight : (imageSource as HTMLCanvasElement).height;

  let width = srcWidth;
  let height = srcHeight;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imageSource, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64 = dataUrl.split(",")[1];
  console.log(`Compressed to ${width}x${height}px, ~${Math.round(base64.length * 0.75 / 1024)}KB`);
  return base64;
}

async function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      try { resolve(await compressImageToBase64(img)); } catch (e) { reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

let pdfjsLibCache: any = null;
async function loadPdfJs(): Promise<any> {
  if (pdfjsLibCache) return pdfjsLibCache;
  if ((window as any).pdfjsLib) {
    pdfjsLibCache = (window as any).pdfjsLib;
    return pdfjsLibCache;
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      pdfjsLibCache = lib;
      resolve(lib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js"));
    document.head.appendChild(script);
  });
}

async function processPdfFile(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return compressImageToBase64(canvas);
}

export async function extractProfileFromFile(file: File): Promise<Partial<ConversationState>> {
  const isPdf = file.type === "application/pdf";
  const isImage = file.type.startsWith("image/");
  if (!isPdf && !isImage) throw new Error("Unsupported file type. Please upload a PDF or image.");

  const base64 = isPdf ? await processPdfFile(file) : await processImageFile(file);

  // Try with automatic fallback to backup key
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const apiKey = getApiKey();
      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: VISION_MODEL,
          max_tokens: 800,
          temperature: 0.1,
          messages: [{
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } },
              { type: "text", text: `You are a medical data extractor. Extract patient information from this medical/pathology/lab report.

Return ONLY a valid JSON object. Use null if a field is not found.

{
  "patient_name": "full patient name or null",
  "age": age as integer or null,
  "cancer_type": "one of: Lung, Breast, Colorectal, Prostate, Melanoma, Ovarian, Lymphoma, Pancreatic, Thyroid, Bladder, Kidney, Myeloma, Liver, Leukemia, Brain, Sarcoma, Gastric, Cervical, Endometrial, Head and Neck — or null",
  "disease_stage": "one of: Stage I, Stage II, Stage III, Stage IV — or null",
  "biomarkers": ["array of biomarker names e.g. EGFR, PD-L1, KRAS, HER2, BRCA1, BRCA2, ALK, ROS1, BRAF — empty array [] if none"],
  "diagnosis_date": "date or period as string e.g. '2023', 'March 2024' — or null",
  "city": "Canadian city name or null",
  "province": "Canadian province full name or null"
}

Return ONLY the JSON. No explanation, no markdown, no extra text.` },
            ],
          }],
        }),
      });

      if (!response.ok) {
        // Check if it's a rate limit error (429)
        if (response.status === 429 && attempt === 0 && switchToBackupKey()) {
          console.log("Rate limit hit on file extraction, retrying with backup key...");
          continue;
        }
        const err = await response.text();
        throw new Error(`Groq vision API error ${response.status}: ${err}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      const result: Partial<ConversationState> = {};
      if (parsed.patient_name && typeof parsed.patient_name === "string") result.patient_name = parsed.patient_name;
      if (parsed.age && typeof parsed.age === "number" && parsed.age >= 1 && parsed.age <= 120) result.age = parsed.age;
      if (parsed.cancer_type && typeof parsed.cancer_type === "string") result.cancer_type = parsed.cancer_type;
      if (parsed.disease_stage && typeof parsed.disease_stage === "string") result.disease_stage = parsed.disease_stage;
      if (Array.isArray(parsed.biomarkers) && parsed.biomarkers.length > 0) result.biomarkers = parsed.biomarkers;
      if (parsed.diagnosis_date && typeof parsed.diagnosis_date === "string") result.diagnosis_date = parsed.diagnosis_date;
      if (parsed.city && typeof parsed.city === "string") result.city = parsed.city;
      if (parsed.province && typeof parsed.province === "string") result.province = parsed.province;

      return result;
    } catch (error) {
      lastError = error as Error;
      if (attempt === 0 && !isUsingBackup && GROQ_API_KEY_BACKUP) {
        switchToBackupKey();
        console.log("Error on file extraction, retrying with backup key...");
        continue;
      }
      break;
    }
  }

  throw lastError || new Error("Failed to extract profile from file");
}

export class GroqChatService {
  private history: ConversationMessage[] = [];
  private state: ConversationState = { isComplete: false };

  constructor() {
    this.history = [{ role: "system", content: SYSTEM_PROMPT }];
  }

  injectExtractedProfile(extracted: Partial<ConversationState>): string {
    if (extracted.patient_name) this.state.patient_name = extracted.patient_name;
    if (extracted.age) this.state.age = extracted.age;
    if (extracted.cancer_type) this.state.cancer_type = extracted.cancer_type;
    if (extracted.disease_stage) this.state.disease_stage = extracted.disease_stage;
    if (extracted.biomarkers && extracted.biomarkers.length > 0) this.state.biomarkers = extracted.biomarkers;
    if (extracted.diagnosis_date) this.state.diagnosis_date = extracted.diagnosis_date;
    if (extracted.city) this.state.city = extracted.city;
    if (extracted.province) this.state.province = extracted.province;

    this.state.isComplete = !!(
      this.state.cancer_type && this.state.disease_stage &&
      this.state.age && (this.state.city || this.state.province)
    );

    const found: string[] = [];
    if (extracted.patient_name) found.push(`Patient name: ${extracted.patient_name}`);
    if (extracted.age) found.push(`Age: ${extracted.age}`);
    if (extracted.cancer_type) found.push(`Cancer type: ${extracted.cancer_type}`);
    if (extracted.disease_stage) found.push(`Disease stage: ${extracted.disease_stage}`);
    if (extracted.biomarkers?.length) found.push(`Biomarkers: ${extracted.biomarkers.join(", ")}`);
    if (extracted.diagnosis_date) found.push(`Diagnosis date: ${extracted.diagnosis_date}`);
    if (extracted.city) found.push(`City: ${extracted.city}`);
    if (extracted.province) found.push(`Province: ${extracted.province}`);

    const missing: string[] = [];
    if (!this.state.cancer_type) missing.push("Cancer type");
    if (!this.state.disease_stage) missing.push("Disease stage");
    if (!this.state.age) missing.push("Age");
    if (!this.state.city && !this.state.province) missing.push("Location");
    if (!this.state.biomarkers) missing.push("Biomarkers");
    if (!this.state.diagnosis_date) missing.push("Diagnosis date");

    const allFound = missing.length === 0;
    const contextMsg = allFound
      ? `[SYSTEM: Medical report uploaded. ALL fields extracted:\n${found.join("\n")}\n\nAll required fields are present. Acknowledge warmly by name if available, then immediately show the confirmation summary table in the exact format specified in your instructions, and ask the patient to confirm.]`
      : `[SYSTEM: Medical report uploaded. Extracted:\n${found.join("\n")}\nStill missing: ${missing.join(", ")}.\nAcknowledge warmly what was found, then ask for the first missing field only.]`;

    this.history.push({ role: "user", content: contextMsg });
    return found.join("\n");
  }

  async sendMessage(userMessage: string): Promise<{
    response: string;
    state: ConversationState;
    shouldSearch: boolean;
  }> {
    this.history.push({ role: "user", content: userMessage });
    this.extractInfo(userMessage);

    // Try with automatic fallback to backup key
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const apiKey = getApiKey();
        const res = await fetch(GROQ_URL, {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: CHAT_MODEL, messages: this.history, max_tokens: 400, temperature: 0.5 }),
        });
        
        if (!res.ok) {
          // Check if it's a rate limit error (429)
          if (res.status === 429 && attempt === 0 && switchToBackupKey()) {
            console.log("Rate limit hit on chat, retrying with backup key...");
            continue;
          }
          throw new Error(`Groq API error: ${res.status}`);
        }
        
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || "Could you try again?";
        this.history.push({ role: "assistant", content: reply });
        this.extractDiagnosisDateFromContext(userMessage);
        const shouldSearch = reply.includes("Let me search for matching trials now") || reply.includes("search for matching trials now");
        return { response: reply, state: this.state, shouldSearch };
      } catch (error) {
        if (attempt === 0 && !isUsingBackup && GROQ_API_KEY_BACKUP) {
          switchToBackupKey();
          console.log("Error on chat, retrying with backup key...");
          continue;
        }
        console.error("Groq error:", error);
        return { response: "I'm having a brief connection issue. Could you try again?", state: this.state, shouldSearch: false };
      }
    }
    
    return { response: "I'm having a brief connection issue. Could you try again?", state: this.state, shouldSearch: false };
  }

  private extractDiagnosisDateFromContext(msg: string) {
    const lower = msg.toLowerCase();
    const skipPhrases = ["skip", "don't know", "not sure", "rather not", "prefer not", "no idea", "unsure"];
    if (skipPhrases.some(p => lower.includes(p))) { if (!this.state.diagnosis_date) this.state.diagnosis_date = "Not specified"; return; }
    const yearMatch = lower.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearMatch) { this.state.diagnosis_date = yearMatch[1]; return; }
    const patterns = [/(\d+)\s*months?\s*ago/i, /(\d+)\s*years?\s*ago/i, /about\s+(\d+)\s*(months?|years?)/i, /(last\s+year|recently|just\s+diagnosed|this\s+year)/i, /(a\s+few\s+months|a\s+few\s+years)/i];
    for (const p of patterns) { const m = lower.match(p); if (m) { this.state.diagnosis_date = m[0]; return; } }
    const monthMatch = lower.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s*(20\d{2})?/i);
    if (monthMatch) this.state.diagnosis_date = monthMatch[0];
  }

  private extractInfo(msg: string) {
    const lower = msg.toLowerCase();

    if (lower.includes("change") || lower.includes("update") || lower.includes("correct")) {
      if (lower.includes("stage")) this.state.disease_stage = undefined;
      if (lower.includes("age")) this.state.age = undefined;
      if (lower.includes("cancer") || lower.includes("type")) this.state.cancer_type = undefined;
      if (lower.includes("city") || lower.includes("location")) { this.state.city = undefined; this.state.province = undefined; }
      if (lower.includes("biomarker")) this.state.biomarkers = undefined;
      if (lower.includes("diagnosis") || lower.includes("date")) this.state.diagnosis_date = undefined;
      this.state.isComplete = false;
      return;
    }

    const cancerTypes = ["lung", "breast", "brain", "colorectal", "colon", "prostate", "melanoma", "ovarian", "lymphoma", "pancreatic", "thyroid", "bladder", "kidney", "myeloma", "liver", "sarcoma", "leukemia", "head and neck", "gastric", "stomach", "cervical", "endometrial", "biliary", "mesothelioma"];
    for (const c of cancerTypes) {
      if (lower.includes(c)) { this.state.cancer_type = c === "colon" ? "Colorectal" : c.charAt(0).toUpperCase() + c.slice(1); break; }
    }

    const stageMatch = lower.match(/stage\s*(i{1,4}v?|[1-4]|iv|advanced|early|metastatic)/i);
    if (stageMatch) {
      let s = stageMatch[1].toUpperCase();
      if (s === "ADVANCED" || s === "METASTATIC") s = "IV";
      if (s === "EARLY") s = "I";
      const map: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV" };
      this.state.disease_stage = `Stage ${map[s] || s}`;
    }
    if (!this.state.disease_stage) {
      if (lower.includes("advanced")) this.state.disease_stage = "Stage IV";
      if (lower.includes("metastatic")) this.state.disease_stage = "Stage IV";
      if (lower.includes("early stage")) this.state.disease_stage = "Stage I";
    }

    const ageMatch = lower.match(/\b(\d{1,3})\s*(?:years?\s*old|yo|y\/o)\b/i) || lower.match(/\b(?:i'm|i am|age|aged)\s*(\d{1,3})\b/i) || lower.match(/\b(\d{2})\s*(?:year|yr)\b/i);
    if (ageMatch) { const age = parseInt(ageMatch[1]); if (age >= 18 && age <= 120) this.state.age = age; }

    if (lower.includes("male") || lower.includes(" man")) this.state.sex = "Male";
    if (lower.includes("female") || lower.includes("woman")) this.state.sex = "Female";

    // Extract city from message — broader matching for any Canadian city
    const cityMap: Record<string, { city: string; province: string }> = {
      "toronto": { city: "Toronto", province: "Ontario" }, "vancouver": { city: "Vancouver", province: "British Columbia" },
      "montreal": { city: "Montreal", province: "Quebec" }, "calgary": { city: "Calgary", province: "Alberta" },
      "edmonton": { city: "Edmonton", province: "Alberta" }, "ottawa": { city: "Ottawa", province: "Ontario" },
      "hamilton": { city: "Hamilton", province: "Ontario" }, "winnipeg": { city: "Winnipeg", province: "Manitoba" },
      "halifax": { city: "Halifax", province: "Nova Scotia" }, "saskatoon": { city: "Saskatoon", province: "Saskatchewan" },
      "victoria": { city: "Victoria", province: "British Columbia" }, "kingston": { city: "Kingston", province: "Ontario" },
      "london": { city: "London", province: "Ontario" }, "moncton": { city: "Moncton", province: "New Brunswick" },
      "quebec city": { city: "Quebec City", province: "Quebec" }, "st. john's": { city: "St. John's", province: "Newfoundland and Labrador" },
      "regina": { city: "Regina", province: "Saskatchewan" }, "kelowna": { city: "Kelowna", province: "British Columbia" },
      "mississauga": { city: "Mississauga", province: "Ontario" }, "surrey": { city: "Surrey", province: "British Columbia" },
      "burnaby": { city: "Burnaby", province: "British Columbia" }, "richmond": { city: "Richmond", province: "British Columbia" },
      "abbotsford": { city: "Abbotsford", province: "British Columbia" }, "barrie": { city: "Barrie", province: "Ontario" },
      "sudbury": { city: "Sudbury", province: "Ontario" }, "thunder bay": { city: "Thunder Bay", province: "Ontario" },
      "lethbridge": { city: "Lethbridge", province: "Alberta" }, "red deer": { city: "Red Deer", province: "Alberta" },
      "sherbrooke": { city: "Sherbrooke", province: "Quebec" }, "saguenay": { city: "Saguenay", province: "Quebec" },
      "fredericton": { city: "Fredericton", province: "New Brunswick" }, "charlottetown": { city: "Charlottetown", province: "Prince Edward Island" },
      "whitehorse": { city: "Whitehorse", province: "Yukon" }, "yellowknife": { city: "Yellowknife", province: "Northwest Territories" },
    };
    for (const [key, val] of Object.entries(cityMap)) {
      if (lower.includes(key)) { this.state.city = val.city; if (!this.state.province) this.state.province = val.province; break; }
    }

    const provinces: Record<string, string> = {
      "ontario": "Ontario", "quebec": "Quebec", "british columbia": "British Columbia", "bc": "British Columbia",
      "alberta": "Alberta", "manitoba": "Manitoba", "saskatchewan": "Saskatchewan", "nova scotia": "Nova Scotia",
      "new brunswick": "New Brunswick", "newfoundland": "Newfoundland and Labrador", "pei": "Prince Edward Island",
      "prince edward island": "Prince Edward Island", "yukon": "Yukon", "northwest territories": "Northwest Territories",
    };
    for (const [key, val] of Object.entries(provinces)) { if (lower.includes(key)) { this.state.province = val; break; } }

    const noBiomarkers = ["no biomarkers", "no biomarker", "don't know", "skip", "none", "not sure", "no idea", "i don't have"];
    if (noBiomarkers.some(p => lower.includes(p))) {
      if (!this.state.biomarkers) this.state.biomarkers = [];
    } else {
      const bms = ["egfr", "alk", "ros1", "braf", "kras", "pd-l1", "her2", "brca", "btk", "bcl-2", "mss", "msi", "folr1", "ret", "fgfr", "ntrk", "met", "lag-3"];
      for (const b of bms) {
        if (lower.includes(b)) {
          if (!this.state.biomarkers) this.state.biomarkers = [];
          const f = b.toUpperCase();
          if (!this.state.biomarkers.includes(f)) this.state.biomarkers.push(f);
        }
      }
    }

    this.extractDiagnosisDateFromContext(msg);
    this.state.isComplete = !!(this.state.cancer_type && this.state.disease_stage && this.state.age && (this.state.city || this.state.province));
  }

  getState(): ConversationState { return this.state; }

  buildUserProfile(): Partial<UserProfile> {
    const u: Partial<UserProfile> = {};
    if (this.state.patient_name) u.name = this.state.patient_name;
    if (this.state.cancer_type) u.cancer_type = this.state.cancer_type;
    if (this.state.disease_stage) u.disease_stage = this.state.disease_stage;
    if (this.state.age) u.age = this.state.age;
    if (this.state.city) u.city = this.state.city;
    if (this.state.province) u.province = this.state.province;
    if (this.state.biomarkers) u.biomarkers = this.state.biomarkers;
    return u;
  }

  // ── Now async — uses real geocoding ──────────────────────────────────────
  async getCityCoordinates(): Promise<{ latitude: number; longitude: number }> {
    if (this.state.city) {
      return geocodeCity(this.state.city, this.state.province);
    }
    return { latitude: 56.1304, longitude: -106.3468 }; // Canada center
  }

  reset() {
    this.state = { isComplete: false };
    this.history = [{ role: "system", content: SYSTEM_PROMPT }];
  }
}
