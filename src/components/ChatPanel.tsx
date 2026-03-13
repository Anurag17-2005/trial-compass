import { useState, useRef, useEffect } from "react";
import { ChatMessage, Trial, UserProfile } from "@/data/types";
import { trials } from "@/data/trials";
import { getRankedByBoth, getNearestTrials, calculateTrialSuitability, calculateDistance } from "@/lib/trialMatching";
import { useAssistant } from "@/contexts/AssistantContext";
import TrialResultCard from "./TrialResultCard";
import { GeminiChatService } from "@/lib/geminiService";

interface ChatPanelProps {
  userProfile?: UserProfile;
  onTrialsFound?: (trials: Trial[]) => void;
  onZoomToLocation?: (trial: Trial) => void;
  onViewTrialDetails?: (trial: Trial) => void;
  selectedTrialId?: string | null;
}

// Helper function to explain eligibility
function explainEligibility(trial: Trial, userProfile: UserProfile): string {
  const reasons: string[] = [];
  
  // Check cancer type match
  if (trial.cancer_type.toLowerCase() === userProfile.cancer_type.toLowerCase()) {
    reasons.push(`✓ Trial accepts ${userProfile.cancer_type} cancer`);
  }
  
  // Check disease stage
  if (trial.disease_stage.includes(userProfile.disease_stage.charAt(6))) {
    reasons.push(`✓ Trial accepts ${userProfile.disease_stage}`);
  }
  
  // Check age (assuming 18+ is standard)
  if (userProfile.age >= 18) {
    reasons.push(`✓ Age requirement met (≥ 18 years)`);
  }
  
  // Check location
  if (trial.province === userProfile.province) {
    reasons.push(`✓ Recruiting in ${trial.city}, ${trial.province}`);
  }
  
  // Check biomarkers
  const matchingBiomarkers = userProfile.biomarkers.filter(bm =>
    trial.biomarkers.some(tb => tb.toLowerCase() === bm.toLowerCase())
  );
  if (matchingBiomarkers.length > 0) {
    reasons.push(`✓ Your biomarkers match: ${matchingBiomarkers.join(", ")}`);
  }
  
  // Check recruitment status
  if (trial.recruitment_status === "Recruiting") {
    reasons.push(`✓ Currently recruiting patients`);
  }
  
  const distance = calculateDistance(
    userProfile.latitude,
    userProfile.longitude,
    trial.latitude,
    trial.longitude
  );
  
  let response = `**Eligibility Explanation for "${trial.title}"**\n\n`;
  response += `**You may qualify because:**\n\n`;
  reasons.forEach(reason => {
    response += `${reason}\n`;
  });
  
  response += `\n**Location:** ${trial.hospital}, ${trial.city} (${distance.toFixed(1)} km away)\n`;
  response += `**Phase:** ${trial.phase}\n`;
  response += `**Treatment:** ${trial.treatment_type}\n\n`;
  
  response += `**Key Inclusion Criteria:**\n`;
  trial.inclusion_criteria.slice(0, 3).forEach(criteria => {
    response += `• ${criteria}\n`;
  });
  
  if (trial.inclusion_criteria.length > 3) {
    response += `...and ${trial.inclusion_criteria.length - 3} more criteria\n`;
  }
  
  response += `\n💡 *Ask your doctor to review the full eligibility criteria and contact the research team.*`;
  
  return response;
}

// Helper function to simplify trial description
function simplifyDescription(trial: Trial): string {
  let response = `**Simplified Explanation: "${trial.title}"**\n\n`;
  
  // Simplify based on treatment type
  const treatmentMap: Record<string, string> = {
    "Immunotherapy": "uses your immune system to fight cancer",
    "Targeted Therapy": "targets specific cancer cells with precision medicine",
    "Chemotherapy": "uses drugs to kill cancer cells",
    "Drug Combination": "combines multiple medications for better results",
    "Radiation": "uses high-energy rays to destroy cancer cells",
    "Surgery": "removes cancerous tissue through surgical procedures",
    "Supportive Care": "helps manage symptoms and improve quality of life"
  };
  
  const treatmentExplanation = treatmentMap[trial.treatment_type] || "tests a new treatment approach";
  
  response += `**What is this trial about?**\n`;
  response += `This ${trial.phase.toLowerCase()} study ${treatmentExplanation} for patients with ${trial.cancer_type.toLowerCase()} cancer (${trial.disease_stage}).\n\n`;
  
  response += `**In simple terms:**\n`;
  response += `${trial.description}\n\n`;
  
  response += `**Treatment Type:** ${trial.treatment_type}\n`;
  response += `**Study Phase:** ${trial.phase}\n`;
  response += `**Location:** ${trial.hospital}, ${trial.city}\n`;
  
  if (trial.biomarkers.length > 0) {
    response += `**Required Biomarkers:** ${trial.biomarkers.join(", ")}\n`;
  }
  
  response += `\n**Why participate?**\n`;
  response += `• Access to new treatments not yet widely available\n`;
  response += `• Close monitoring by medical experts\n`;
  response += `• Contributing to cancer research\n\n`;
  
  response += `💡 *Want to know if you're eligible? Ask me to "explain eligibility for this trial"*`;
  
  return response;
}

// Helper function to compare trials
function compareTrials(trial1: Trial, trial2: Trial, userProfile?: UserProfile): string {
  let response = `**Comparing Two Trials**\n\n`;
  
  response += `**Trial 1: ${trial1.title}**\n`;
  response += `**Trial 2: ${trial2.title}**\n\n`;
  
  response += `**━━━ Treatment Approach ━━━**\n`;
  response += `Trial 1: ${trial1.treatment_type} (${trial1.phase})\n`;
  response += `Trial 2: ${trial2.treatment_type} (${trial2.phase})\n\n`;
  
  response += `**━━━ Location ━━━**\n`;
  response += `Trial 1: ${trial1.hospital}, ${trial1.city}\n`;
  response += `Trial 2: ${trial2.hospital}, ${trial2.city}\n`;
  
  if (userProfile) {
    const dist1 = calculateDistance(userProfile.latitude, userProfile.longitude, trial1.latitude, trial1.longitude);
    const dist2 = calculateDistance(userProfile.latitude, userProfile.longitude, trial2.latitude, trial2.longitude);
    response += `Distance: ${dist1.toFixed(1)} km vs ${dist2.toFixed(1)} km\n`;
    
    const match1 = calculateTrialSuitability(trial1, userProfile);
    const match2 = calculateTrialSuitability(trial2, userProfile);
    response += `\n**━━━ Your Match Score ━━━**\n`;
    response += `Trial 1: ${match1}% match\n`;
    response += `Trial 2: ${match2}% match\n`;
  }
  
  response += `\n**━━━ Recruitment Status ━━━**\n`;
  response += `Trial 1: ${trial1.recruitment_status}\n`;
  response += `Trial 2: ${trial2.recruitment_status}\n`;
  
  response += `\n**━━━ Biomarkers ━━━**\n`;
  response += `Trial 1: ${trial1.biomarkers.length > 0 ? trial1.biomarkers.join(", ") : "None specified"}\n`;
  response += `Trial 2: ${trial2.biomarkers.length > 0 ? trial2.biomarkers.join(", ") : "None specified"}\n`;
  
  response += `\n**━━━ Key Differences ━━━**\n`;
  
  if (trial1.treatment_type !== trial2.treatment_type) {
    response += `• Different treatment types: ${trial1.treatment_type} vs ${trial2.treatment_type}\n`;
  }
  
  if (trial1.phase !== trial2.phase) {
    response += `• Different study phases: ${trial1.phase} vs ${trial2.phase}\n`;
  }
  
  if (trial1.disease_stage !== trial2.disease_stage) {
    response += `• Different disease stages: ${trial1.disease_stage} vs ${trial2.disease_stage}\n`;
  }
  
  response += `\n💡 *Want more details? Ask me to "explain" or "simplify" either trial.*`;
  
  return response;
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

function searchTrials(intent: ReturnType<typeof extractIntent>, userProfile?: UserProfile) {
  let results = trials.filter((t) => {
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

  // If no specific criteria, use user profile to filter
  if (results.length === 0 && userProfile) {
    results = trials;
  }

  return results;
}

function generateResponse(message: string, found: Trial[], userProfile?: UserProfile, sortType?: "nearest" | "best" | "default"): string {
  const lower = message.toLowerCase();

  if (lower.includes("hello") || lower.includes("hi") || lower === "hey") {
    if (userProfile) {
      return `Hello ${userProfile.name}! I'm your AI Trial Assistant. Based on your profile (${userProfile.cancer_type}, ${userProfile.disease_stage}), I can find the best matching trials for you. You can ask me to find trials near you or with specific treatments!`;
    }
    return "Hello! I'm your AI Trial Assistant. I can help you find clinical trials based on your condition, location, and preferences. Tell me about your cancer type, stage, or location and I'll find matching trials for you.";
  }

  if (lower.includes("help") || lower.includes("what can you do")) {
    return "I can help you with:\n\n• **Find trials for you** — I'll use your health profile to recommend the best matches\n• **Nearest trials** — Find the closest trial centres to you\n• **Best match trials** — See which trials are most suitable for your condition\n• **Explain eligibility** — Ask me to explain why you may qualify for a trial\n• **Simplify trial** — I can explain any trial in simple, easy-to-understand terms\n• **Compare trials** — I can compare 2 trials side-by-side for you\n\nJust search for trials first, then ask me to explain, simplify, or compare!";
  }

  if (lower.includes("nearest") && userProfile) {
    const nearest = getNearestTrials(trials, userProfile, 5); // Get only 5
    let response = `**Nearest Trials to You** (showing top 5, sorted by distance):\n\n`;
    nearest.forEach((t, i) => {
      const suitability = calculateTrialSuitability(t, userProfile);
      response += `**${i + 1}. ${t.title}**\n`;
      response += `• Location: ${t.hospital}, ${t.city}\n`;
      response += `• Distance: ${t.distance.toFixed(1)} km away\n`;
      response += `• Match Score: ${suitability}%\n`;
      response += `• Status: ${t.recruitment_status}\n\n`;
    });
    return response;
  }

  if (lower.includes("best") && userProfile) {
    const ranked = getRankedByBoth(trials, userProfile).slice(0, 5); // Get only 5
    let response = `**Best Matching Trials for You** (showing top 5, sorted by match score):\n\n`;
    ranked.forEach((t, i) => {
      response += `**${i + 1}. ${t.title}**\n`;
      response += `• Match Score: ${t.combinedScore}%\n`;
      response += `• Location: ${t.city} (${t.distance.toFixed(1)} km away)\n`;
      response += `• Treatment: ${t.treatment_type}\n`;
      response += `• Status: ${t.recruitment_status}\n\n`;
    });
    return response;
  }

  if (found.length === 0) {
    return userProfile 
      ? `I couldn't find trials matching your specific criteria. Try asking me to find your "nearest trials" or "best match trials" instead!`
      : "I couldn't find any trials matching your criteria. Try being more specific or adjusting your search. You can mention a cancer type (e.g., lung, breast), a stage (e.g., stage 2), or a location (e.g., Toronto, Ontario).";
  }

  // Display trials with appropriate sorting label
  const sortLabel = sortType === "nearest" 
    ? " (showing top 5, sorted by distance)" 
    : sortType === "best" 
      ? " (showing top 5, sorted by match score)" 
      : userProfile 
        ? " (showing top 5, sorted by match score)" 
        : "";

  let response = `I found **${found.length} trial${found.length > 1 ? "s" : ""}**${sortLabel}:\n\n`;
  found.forEach((t, i) => {
    response += `**${i + 1}. ${t.title}**\n`;
    response += `• Status: ${t.recruitment_status}\n`;
    response += `• Location: ${t.hospital}, ${t.city}\n`;
    response += `• Treatment: ${t.treatment_type}\n`;
    if (userProfile) {
      const suitability = calculateTrialSuitability(t, userProfile);
      const distance = calculateDistance(
        userProfile.latitude,
        userProfile.longitude,
        t.latitude,
        t.longitude
      );
      response += `• Match: ${suitability}%\n`;
      response += `• Distance: ${distance.toFixed(1)} km away\n`;
    }
    if (t.biomarkers.length > 0) response += `• Biomarkers: ${t.biomarkers.join(", ")}\n`;
    response += `\n`;
  });

  response += "\n\nWould you like me to explain any of these trials in detail or check your eligibility?";
  return response;
}

const ChatPanel = ({ userProfile, onTrialsFound, onZoomToLocation, onViewTrialDetails, selectedTrialId }: ChatPanelProps) => {
  const { messages, setMessages, setUserProfile } = useAssistant();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [geminiChat] = useState(() => new GeminiChatService());
  const [useGemini, setUseGemini] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const trialCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    // Only auto-scroll if the last message doesn't have trials (trial cards)
    // This prevents scrolling past all trial results to the bottom
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && !lastMessage.trials) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auto-scroll to selected trial when clicked from map
  useEffect(() => {
    if (selectedTrialId && trialCardRefs.current[selectedTrialId]) {
      trialCardRefs.current[selectedTrialId]?.scrollIntoView({ 
        behavior: "smooth", 
        block: "center" 
      });
      // Highlight the card briefly
      const card = trialCardRefs.current[selectedTrialId];
      if (card) {
        card.style.boxShadow = "0 0 0 3px #2563eb";
        setTimeout(() => {
          card.style.boxShadow = "";
        }, 2000);
      }
    }
  }, [selectedTrialId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    // Check if we should use Gemini for conversational flow
    if (useGemini && !geminiChat.isReadyToSearch()) {
      try {
        const result = await geminiChat.sendMessage(currentInput);
        
        // Update user profile with collected information
        if (userProfile) {
          const profileUpdates = geminiChat.buildUserProfile(userProfile);
          if (Object.keys(profileUpdates).length > 0) {
            setUserProfile({ ...userProfile, ...profileUpdates });
          }
        }

        // If Gemini indicates we should search, trigger trial search
        if (result.shouldSearch && result.state.isComplete) {
          const state = result.state;
          
          // Build search criteria from conversation state
          let found: Trial[] = trials.filter((t) => {
            if (state.cancer_type && !t.cancer_type.toLowerCase().includes(state.cancer_type.toLowerCase())) return false;
            if (state.city && !t.city.toLowerCase().includes(state.city.toLowerCase())) return false;
            if (state.province && t.province !== state.province) return false;
            if (state.disease_stage) {
              const stageNum = state.disease_stage.match(/\d+/)?.[0];
              if (stageNum && !t.disease_stage.includes(stageNum)) return false;
            }
            return true;
          });

          // Rank by suitability if we have profile info
          if (userProfile) {
            found = getRankedByBoth(found, userProfile).slice(0, 5);
          } else {
            found = found.slice(0, 5);
          }

          if (onTrialsFound) {
            onTrialsFound(found);
          }

          // Local summary - avoids extra Gemini call that can timeout on free tier
          let finalResponse = result.response;
          if (found.length > 0) {
            finalResponse += `\n\nGreat news! I found **${found.length} matching trial${found.length > 1 ? 's' : ''}** for you. Here are your best matches:`;
          } else {
            finalResponse += "\n\nI couldn't find any trials matching your specific criteria right now. Let me search more broadly for you.";
            // Fallback to broader search
            found = trials.filter(t => 
              state.cancer_type ? t.cancer_type.toLowerCase().includes(state.cancer_type.toLowerCase()) : true
            ).slice(0, 5);
            if (onTrialsFound && found.length > 0) {
              onTrialsFound(found);
            }
          }

          const assistantMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: finalResponse,
            trials: found.length > 0 ? found : undefined,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          
          // Disable Gemini mode after successful search
          setUseGemini(false);
        } else {
          // Just add the conversational response
          const assistantMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: result.response,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
        
        setIsTyping(false);
        return;
      } catch (error) {
        console.error("Gemini error:", error);
        // Fall back to rule-based system
        setUseGemini(false);
        
        // Show fallback message
        const fallbackMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I'm having trouble with my AI assistant right now. Let me help you search for trials using our standard search. You can tell me about your cancer type, stage, or location.",
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        setIsTyping(false);
        return;
      }
    }

    // Original rule-based logic
    setTimeout(async () => {
      const lower = currentInput.toLowerCase();
      let response = "";
      let found: Trial[] = [];
      let sortType: "nearest" | "best" | "default" = "default";
      
      // Feature 3: Explain eligibility
      if ((lower.includes("explain") || lower.includes("eligibility") || lower.includes("qualify")) && userProfile) {
        // Find trial by title match or recent trial
        const recentTrials = messages
          .filter(m => m.trials && m.trials.length > 0)
          .slice(-1)[0]?.trials || [];
        
        if (recentTrials.length > 0) {
          // Try to find specific trial mentioned
          let targetTrial = recentTrials[0];
          
          // Check if user mentioned a specific trial
          for (const trial of recentTrials) {
            const titleWords = trial.title.toLowerCase().split(" ");
            if (titleWords.some(word => word.length > 4 && lower.includes(word))) {
              targetTrial = trial;
              break;
            }
          }
          
          response = explainEligibility(targetTrial, userProfile);
        } else {
          response = "Please search for trials first, then I can explain eligibility for a specific trial.";
        }
      }
      // NEW: Ask Gemini to analyze and recommend best trials
      else if ((lower.includes("which") || lower.includes("best") || lower.includes("recommend") || lower.includes("should i choose")) && userProfile) {
        const recentTrials = messages
          .filter(m => m.trials && m.trials.length > 0)
          .slice(-1)[0]?.trials || [];
        
        if (recentTrials.length > 0) {
          try {
            const analysis = await geminiChat.analyzeTrials(recentTrials, userProfile);
            response = analysis;
          } catch (error) {
            console.error("Analysis error:", error);
            response = "I can see you have several good options. Based on your profile, I'd recommend focusing on the trials with the highest match scores and closest to your location.";
          }
        } else {
          response = "Please search for trials first, then I can help you decide which ones are best for you.";
        }
      }
      // Feature 4: Simplify description
      else if (lower.includes("simplify") || lower.includes("explain trial") || lower.includes("what is this trial")) {
        const recentTrials = messages
          .filter(m => m.trials && m.trials.length > 0)
          .slice(-1)[0]?.trials || [];
        
        if (recentTrials.length > 0) {
          let targetTrial = recentTrials[0];
          
          // Check if user mentioned a specific trial
          for (const trial of recentTrials) {
            const titleWords = trial.title.toLowerCase().split(" ");
            if (titleWords.some(word => word.length > 4 && lower.includes(word))) {
              targetTrial = trial;
              break;
            }
          }
          
          response = simplifyDescription(targetTrial);
        } else {
          response = "Please search for trials first, then I can simplify the description for you.";
        }
      }
      // Feature 5: Compare trials
      else if (lower.includes("compare")) {
        const recentTrials = messages
          .filter(m => m.trials && m.trials.length > 0)
          .slice(-1)[0]?.trials || [];
        
        if (recentTrials.length >= 2) {
          response = compareTrials(recentTrials[0], recentTrials[1], userProfile);
        } else if (recentTrials.length === 1) {
          response = "I need at least 2 trials to compare. Please search for more trials first.";
        } else {
          response = "Please search for trials first, then I can compare them for you.";
        }
      }
      // Existing search functionality
      else {
        const intent = extractIntent(currentInput);
        found = searchTrials(intent, userProfile);
        
        if (lower.includes("nearest") && userProfile) {
          found = getNearestTrials(trials, userProfile, 5); // Limit to 5
          sortType = "nearest";
        } else if (lower.includes("best") && userProfile) {
          found = getRankedByBoth(trials, userProfile).slice(0, 5); // Limit to 5
          sortType = "best";
        } else if (userProfile && found.length > 0) {
          // Default sorting: by best match (suitability first, then distance)
          found = found
            .map((trial) => ({
              ...trial,
              suitabilityScore: calculateTrialSuitability(trial, userProfile),
              distance: calculateDistance(
                userProfile.latitude,
                userProfile.longitude,
                trial.latitude,
                trial.longitude
              ),
            }))
            .sort((a, b) => {
              // Primary: suitability score (descending)
              if (b.suitabilityScore !== a.suitabilityScore) {
                return b.suitabilityScore - a.suitabilityScore;
              }
              // Secondary: distance (ascending) for same suitability
              return a.distance - b.distance;
            })
            .slice(0, 5); // Limit to 5
          sortType = "best";
        }
        
        // Limit found results to 5 maximum
        if (found.length > 5) {
          found = found.slice(0, 5);
        }
        
        response = generateResponse(currentInput, found, userProfile, sortType);
      }

      if (found.length > 0 && onTrialsFound) {
        onTrialsFound(found);
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        trials: found.length > 0 ? found : undefined,
      };
      
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground text-sm">AI Trial Assistant</h2>
            <p className="text-xs text-muted-foreground">
              {userProfile ? `${userProfile.name} • ${userProfile.city}, ${userProfile.province}` : "Describe your condition to find matching trials"}
            </p>
          </div>
          {useGemini && (
            <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              Conversational Mode
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "user" ? (
              <div className="chat-bubble-user">
                <p className="text-sm">{msg.content}</p>
              </div>
            ) : msg.trials && msg.trials.length > 0 ? (
              // Display trials as cards
              <div className="w-full max-w-md space-y-2">
                {msg.trials.map((trial) => (
                  <div 
                    key={trial.trial_id}
                    ref={(el) => {
                      trialCardRefs.current[trial.trial_id] = el;
                    }}
                  >
                    <TrialResultCard
                      trial={trial}
                      userProfile={userProfile}
                      onViewDetails={onViewTrialDetails}
                      onZoomToLocation={onZoomToLocation}
                    />
                  </div>
                ))}
              </div>
            ) : (
              // Display text message
              <div className="chat-bubble-assistant">
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={useGemini ? "Tell me about your condition..." : "Ask about nearest or best trials..."}
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
          {!useGemini && userProfile 
            ? ["Find nearest trials", "Best matches for me", "Which trial is best?", "Explain eligibility"].map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors"
              >
                {s}
              </button>
            ))
            : useGemini 
              ? (
                <button
                  onClick={() => {
                    geminiChat.reset();
                    setMessages([{
                      id: "welcome",
                      role: "assistant",
                      content: "Hello! I'm here to help you find clinical trials. Let's start by learning about your condition. What type of cancer have you been diagnosed with?",
                    }]);
                  }}
                  className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Start over
                </button>
              )
              : ["I have lung cancer", "Trials in Toronto", "Stage 2 breast cancer"].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors"
                >
                  {s}
                </button>
              ))
          }
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;


