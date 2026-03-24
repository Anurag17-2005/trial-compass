import { UserProfile } from "@/data/types";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_API_KEY_BACKUP = import.meta.env.VITE_GROQ_API_KEY_BACKUP || "";
const GROQ_API_KEY_TERTIARY = import.meta.env.VITE_GROQ_API_KEY_TERTIARY || "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const CHAT_MODEL = "llama-3.3-70b-versatile";

const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 0.82;

// Track which API key is currently active
let currentApiKey = GROQ_API_KEY;
let currentKeyIndex = 0; // 0 = primary, 1 = backup, 2 = tertiary
let primaryKeyBlocked = false;
let backupKeyBlocked = false;
let tertiaryKeyBlocked = false;
let primaryKeyBlockedUntil = 0;
let backupKeyBlockedUntil = 0;
let tertiaryKeyBlockedUntil = 0;

// Get all available API keys
function getAvailableKeys(): string[] {
  const keys = [];
  if (GROQ_API_KEY) keys.push(GROQ_API_KEY);
  if (GROQ_API_KEY_BACKUP) keys.push(GROQ_API_KEY_BACKUP);
  if (GROQ_API_KEY_TERTIARY) keys.push(GROQ_API_KEY_TERTIARY);
  return keys;
}

// Function to get the current API key
function getApiKey(): string {
  const now = Date.now();
  const keys = getAvailableKeys();
  
  // Check if blocked keys have recovered (5 minutes = 300000ms)
  if (primaryKeyBlocked && now > primaryKeyBlockedUntil) {
    console.log("Primary API key cooldown period ended, marking as available");
    primaryKeyBlocked = false;
  }
  if (backupKeyBlocked && now > backupKeyBlockedUntil) {
    console.log("Backup API key cooldown period ended, marking as available");
    backupKeyBlocked = false;
  }
  if (tertiaryKeyBlocked && now > tertiaryKeyBlockedUntil) {
    console.log("Tertiary API key cooldown period ended, marking as available");
    tertiaryKeyBlocked = false;
  }
  
  // Check if current key is blocked, if so find an available one
  const blockedStates = [primaryKeyBlocked, backupKeyBlocked, tertiaryKeyBlocked];
  
  if (blockedStates[currentKeyIndex]) {
    // Current key is blocked, find an available one
    for (let i = 0; i < keys.length; i++) {
      if (!blockedStates[i]) {
        console.log(`Current key blocked, switching to key ${i + 1}`);
        currentKeyIndex = i;
        currentApiKey = keys[i];
        break;
      }
    }
  }
  
  return currentApiKey;
}

// Function to mark current key as rate limited and switch to the next available
function handleRateLimit(): boolean {
  const now = Date.now();
  const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
  const keys = getAvailableKeys();
  
  // Mark current key as blocked
  if (currentKeyIndex === 0) {
    console.log("Primary API key hit rate limit, marking as blocked for 5 minutes");
    primaryKeyBlocked = true;
    primaryKeyBlockedUntil = now + cooldownPeriod;
  } else if (currentKeyIndex === 1) {
    console.log("Backup API key hit rate limit, marking as blocked for 5 minutes");
    backupKeyBlocked = true;
    backupKeyBlockedUntil = now + cooldownPeriod;
  } else if (currentKeyIndex === 2) {
    console.log("Tertiary API key hit rate limit, marking as blocked for 5 minutes");
    tertiaryKeyBlocked = true;
    tertiaryKeyBlockedUntil = now + cooldownPeriod;
  }
  
  // Try to find an available key
  const blockedStates = [primaryKeyBlocked, backupKeyBlocked, tertiaryKeyBlocked];
  
  for (let i = 0; i < keys.length; i++) {
    if (!blockedStates[i]) {
      console.log(`Switching to API key ${i + 1}`);
      currentKeyIndex = i;
      currentApiKey = keys[i];
      return true; // Successfully switched
    }
  }
  
  // All keys are blocked
  console.log("All API keys are rate limited");
  return false;
}

// Function to switch to backup key (legacy support)
function switchToBackupKey(): boolean {
  return handleRateLimit();
}

// Function to reset to primary key (call this periodically or after cooldown)
export function resetToPrimaryKey(): void {
  const now = Date.now();
  
  // Check if primary key cooldown has ended
  if (primaryKeyBlocked && now > primaryKeyBlockedUntil) {
    console.log("Primary key cooldown ended, marking as available");
    primaryKeyBlocked = false;
  }
  
  // If not using primary and primary is available, switch back
  if (currentKeyIndex !== 0 && !primaryKeyBlocked && GROQ_API_KEY) {
    console.log("Resetting to primary API key");
    currentKeyIndex = 0;
    currentApiKey = GROQ_API_KEY;
  }
}

// Get current key status for debugging
export function getKeyStatus(): { 
  currentKeyIndex: number;
  totalKeys: number;
  primaryBlocked: boolean;
  backupBlocked: boolean;
  tertiaryBlocked: boolean;
  primaryBlockedUntil: number;
  backupBlockedUntil: number;
  tertiaryBlockedUntil: number;
} {
  return {
    currentKeyIndex,
    totalKeys: getAvailableKeys().length,
    primaryBlocked: primaryKeyBlocked,
    backupBlocked: backupKeyBlocked,
    tertiaryBlocked: tertiaryKeyBlocked,
    primaryBlockedUntil: primaryKeyBlockedUntil,
    backupBlockedUntil: backupKeyBlockedUntil,
    tertiaryBlockedUntil: tertiaryKeyBlockedUntil,
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

const SYSTEM_PROMPT = `You are a compassionate clinical trial navigator helping patients find trials in Canada. Be warm, brief, and natural - like a caring friend, not a therapist.

## YOUR STYLE:
- **Be brief** - 1-2 sentences max per response
- **Be natural** - conversational, not scripted
- **Be warm** - but don't overdo empathy
- **Vary your approach** - don't repeat phrases
- **Give occasional compliments** - but sparingly

## INFORMATION TO COLLECT:
1. Cancer type
2. Stage (early/advanced/spread OR 1-4)
3. Age
4. City + Province
5. Biomarkers (optional)
6. Diagnosis date (optional)
7. Confirm & search

## FIRST-TIME GUIDANCE RULES:
- **FIRST TIME asking each question**: Include helpful context about answer flexibility
- **SUBSEQUENT TIMES**: Skip the guidance, just ask the question directly
- Track which questions have been asked before using conversation history

## CONVERSATION EXAMPLES:

**Opening (ALWAYS include UI orientation on very first message):**
"Hi there 👋 I'm here to help you find clinical trials in Canada. You'll see your progress at the top, and you can type below, upload medical reports, or use suggestions. The map and trial summaries will appear on the right as we go. Let's take it one step at a time. What type of cancer are you dealing with?"
[SUGGESTIONS: "Lung cancer" | "Breast cancer" | "Colorectal cancer"]

**After cancer type (FIRST TIME - include guidance):**
"I'm sorry to hear that. Can you tell me about the stage? You can say 'early', 'advanced', 'it has spread', or use numbers like 1, 2, 3, or 4 - whatever feels right."
[SUGGESTIONS: "It's early" | "Stage 3" | "It has spread"]

**After cancer type (SUBSEQUENT TIMES - no guidance):**
"I'm sorry to hear that. What stage is it?"
[SUGGESTIONS: "It's early" | "Stage 3" | "It has spread"]

**After stage (FIRST TIME - include guidance):**
"Got it. How old are you? If you're more comfortable, you can also say '30s', '40s', or '50s' instead of an exact number."
[SUGGESTIONS: "I'm 45" | "I'm 60" | "In my 50s"]

**After stage (SUBSEQUENT TIMES - no guidance):**
"Got it. How old are you?"
[SUGGESTIONS: "I'm 45" | "I'm 60" | "In my 50s"]

**After age (FIRST TIME - include guidance):**
"Which city are you in? You can tell me your city and province, or just a nearby city if that's easier."
[SUGGESTIONS: "Toronto, Ontario" | "Vancouver" | "Montreal"]

**After age (SUBSEQUENT TIMES - no guidance):**
"Which city are you in?"
[SUGGESTIONS: "Toronto" | "Vancouver" | "Montreal"]

**After location (FIRST TIME - two-step approach):**
"Do you know your biomarkers? If you're not sure what biomarkers are, I can explain."
[SUGGESTIONS: "Yes, I know them" | "What are biomarkers?" | "I don't know" | "Skip"]

**If user asks "What are biomarkers?":**
"Biomarkers are genetic markers in your tumor, like EGFR, PD-L1, KRAS, or HER2. They help match you to targeted therapies. Do you know if you have any?"
[SUGGESTIONS: "EGFR positive" | "PD-L1 positive" | "I don't know"]

**After location (SUBSEQUENT TIMES - no guidance):**
"Do you know your biomarkers?"
[SUGGESTIONS: "EGFR positive" | "I don't know" | "Skip"]

**After biomarkers (FIRST TIME - include guidance):**
"Last thing - when were you diagnosed? You can give me the exact date, or say something like '2 years ago', '6 months back', or 'last year' - whatever you remember."
[SUGGESTIONS: "About 6 months ago" | "2 years ago" | "Skip"]

**After biomarkers (SUBSEQUENT TIMES - no guidance):**
"Last thing - when were you diagnosed? You can say 'about 6 months ago' or skip."
[SUGGESTIONS: "About 6 months ago" | "Last year" | "Skip"]

## IMPORTANT RULES:
- **Keep responses SHORT** - 1-2 sentences maximum (3 sentences ONLY for first-time guidance)
- **Don't repeat empathy** - one "I'm sorry to hear that" is enough
- **Don't explain everything** - just ask the question
- **Don't say "you're being brave" or "thank you for trusting me"** - too much
- **Vary your language** - don't use the same phrases
- **Add warmth occasionally** - not every message
- **Always include [SUGGESTIONS: "opt1" | "opt2" | "opt3"]** at the end
- **CRITICAL**: Only include guidance text on FIRST TIME asking each specific question
- **NEVER ASSUME "Not specified"** - If user doesn't answer a required field (cancer type, stage, age, location), you MUST ask again
- **ONLY mark as "Not specified"** when user explicitly says "skip", "I don't know", "I'd rather not say", or similar
- **When user changes a field**: Re-ask ALL subsequent required fields that were skipped or not answered
- **Biomarkers approach**: First ask if they know what biomarkers are, explain only if they ask

## CONFIRMATION TABLE:
Once you have type + stage + age + location (all answered, not skipped):

---
Here's what I have:

| Detail | Value |
|---|---|
| Cancer Type | [value] |
| Stage | [value] |
| Age | [value] |
| Location | [city, province] |
| Biomarkers | [value or Not specified] |
| Diagnosis Date | [value or Not specified] |

Does this look right?
---
[SUGGESTIONS: "Yes, correct" | "Need to change something"]

**If user wants to change something:**
"Which detail would you like to update?"
[SUGGESTIONS: "Change cancer type" | "Change stage" | "Change age" | "Change location"]

**After user changes a field:**
- If they changed cancer type, stage, or age: Continue from where they left off
- If location was previously skipped/not answered: Ask for location again
- If biomarkers were previously skipped/not answered: Ask for biomarkers again
- Never show "Not specified" unless user explicitly skipped

**After confirmation:**
"Perfect! Let me search for matching trials now. 🔍"

## CRITICAL:
- Be BRIEF - no long explanations
- Be NATURAL - like texting a friend
- Don't overdo empathy or compliments
- Always include [SUGGESTIONS: ...] at end
- Keep it simple and conversational`;



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
  
  // Keep trying while we have available API keys
  while (true) {
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
        if (response.status === 429) {
          console.log("Rate limit hit on file extraction, attempting to switch API key...");
          if (handleRateLimit()) {
            console.log("Successfully switched to alternate API key, retrying...");
            continue;
          } else {
            console.log("All API keys are rate limited");
            const status = getKeyStatus();
            const keyCount = status.totalKeys;
            throw new Error(`API_RATE_LIMIT: All ${keyCount} API key${keyCount > 1 ? 's are' : ' is'} rate limited. Please wait a moment and try again.`);
          }
        }
        
        const err = await response.text();
        
        // Provide user-friendly error messages
        if (response.status === 401) {
          throw new Error("API_AUTH_ERROR: API authentication failed. Please check your API keys.");
        } else if (response.status === 500 || response.status === 503) {
          throw new Error("API_SERVER_ERROR: The AI service is temporarily unavailable. Please try again in a moment.");
        } else {
          throw new Error(`Groq vision API error ${response.status}: ${err}`);
        }
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
      
      // If it's not a rate limit error, throw immediately
      if (!lastError.message.includes("API_RATE_LIMIT")) {
        throw lastError;
      }
      
      // If both keys are blocked, throw the error
      const status = getKeyStatus();
      if (status.primaryBlocked && status.backupBlocked) {
        throw lastError;
      }
      
      // Otherwise, the handleRateLimit in the response check will switch keys
      // and we'll retry on the next iteration
    }
  }
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

    // Keep trying while we have available API keys
    while (true) {
      try {
        const apiKey = getApiKey();
        const res = await fetch(GROQ_URL, {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: CHAT_MODEL, messages: this.history, max_tokens: 400, temperature: 0.5 }),
        });
        
        if (!res.ok) {
          // Check if it's a rate limit error (429)
          if (res.status === 429) {
            console.log("Rate limit hit on chat, attempting to switch API key...");
            if (handleRateLimit()) {
              console.log("Successfully switched to alternate API key, retrying...");
              continue;
            } else {
              console.log("All API keys are rate limited");
              const status = getKeyStatus();
              const keyCount = status.totalKeys;
              throw new Error(`API_RATE_LIMIT: All ${keyCount} API key${keyCount > 1 ? 's are' : ' is'} rate limited. Please wait a moment and try again.`);
            }
          }
          
          // Provide user-friendly error messages
          if (res.status === 401) {
            throw new Error("API_AUTH_ERROR: API authentication failed. Please check your API keys.");
          } else if (res.status === 500 || res.status === 503) {
            throw new Error("API_SERVER_ERROR: The AI service is temporarily unavailable. Please try again in a moment.");
          } else {
            throw new Error(`Groq API error: ${res.status}`);
          }
        }
        
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || "Could you try again?";
        this.history.push({ role: "assistant", content: reply });
        this.extractDiagnosisDateFromContext(userMessage);
        const shouldSearch = reply.includes("Let me search for matching trials now") || reply.includes("search for matching trials now");
        return { response: reply, state: this.state, shouldSearch };
      } catch (error) {
        console.error("Groq error:", error);
        
        // Re-throw the error to be handled by the caller
        throw error;
      }
    }
  }

  private extractDiagnosisDateFromContext(msg: string) {
    const lower = msg.toLowerCase();
    const skipPhrases = ["skip", "don't know", "not sure", "rather not", "prefer not", "no idea", "unsure"];
    
    // Only mark as "Not specified" if user explicitly says skip AND we're in the diagnosis date context
    const inDiagnosisContext = this.history.some(h => h.content.toLowerCase().includes("when were you") || h.content.toLowerCase().includes("diagnosis date"));
    if (inDiagnosisContext && skipPhrases.some(p => lower.includes(p))) { 
      if (!this.state.diagnosis_date) this.state.diagnosis_date = "Not specified"; 
      return; 
    }
    
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

    // Enhanced stage extraction with simple language support
    const stageMatch = lower.match(/stage\s*(i{1,4}v?|[1-4]|iv|advanced|early|metastatic|spread)/i);
    if (stageMatch) {
      let s = stageMatch[1].toUpperCase();
      if (s === "ADVANCED" || s === "METASTATIC" || s === "SPREAD") s = "IV";
      if (s === "EARLY") s = "I";
      const map: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV" };
      this.state.disease_stage = `Stage ${map[s] || s}`;
    }
    
    // Additional patterns for simple language
    if (!this.state.disease_stage) {
      if (lower.includes("has spread") || lower.includes("it spread") || lower.includes("it's spread")) this.state.disease_stage = "Stage IV";
      if (lower.includes("more advanced") || lower.includes("pretty advanced")) this.state.disease_stage = "Stage III";
      if (lower.includes("advanced")) this.state.disease_stage = "Stage IV";
      if (lower.includes("metastatic")) this.state.disease_stage = "Stage IV";
      if (lower.includes("early stage") || lower.includes("it's early") || lower.includes("early,")) this.state.disease_stage = "Stage I";
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

    // Only mark biomarkers as explicitly skipped if user says so
    const noBiomarkers = ["no biomarkers", "no biomarker", "don't know", "skip", "none", "not sure", "no idea", "i don't have"];
    if (noBiomarkers.some(p => lower.includes(p)) && (lower.includes("biomarker") || this.history.some(h => h.content.toLowerCase().includes("biomarker")))) {
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
    
    // Only mark as complete if ALL required fields are actually provided (not just asked)
    this.state.isComplete = !!(
      this.state.cancer_type && 
      this.state.disease_stage && 
      this.state.age && 
      (this.state.city || this.state.province)
    );
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
