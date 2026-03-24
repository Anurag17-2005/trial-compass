# Chatbot Improvements - First-Time User Guidance & Smart Progress Tracking

## Summary of Changes (Updated)

I've updated the chatbot to:
1. Provide helpful context ONLY the first time each question is asked
2. Show checkmarks (✓) for completed steps in the progress bar
3. NEVER assume "Not specified" - always ask again if user doesn't answer
4. Use a two-step approach for biomarkers (ask if they know what they are first)
5. Re-ask skipped questions when user goes back to change something

## What Was Changed

### 1. **Updated System Prompt** (`src/lib/groqService.ts`)

The AI now follows these rules:
- **First time asking each question**: Includes helpful context about answer flexibility
- **Subsequent times**: Skips the guidance, just asks directly
- **NEVER assumes "Not specified"**: Only marks as "Not specified" when user explicitly says "skip", "I don't know", etc.
- **Re-asks skipped questions**: When user changes a field, re-asks any previously skipped required fields
- **Two-step biomarkers**: First asks if they know what biomarkers are, explains only if they ask

### 2. **Enhanced Progress Bar** (`src/components/ChatPanel.tsx`)

- Completed steps now show checkmarks (✓) instead of icons
- Active step shows the icon with a pulsing border
- Checkmarks are larger (w-6 h-6) and have shadow for better visibility
- When going back, previous steps keep their checkmarks, only current step pulses

### 3. **Smarter Field Tracking** (`src/lib/groqService.ts`)

- Only marks fields as complete when user actually provides information
- Biomarkers only marked as skipped if user says "skip" or "I don't know" in biomarker context
- Diagnosis date only marked as "Not specified" if user explicitly skips in diagnosis context
- Location must be provided - won't show "Not specified" unless explicitly skipped

## New Conversation Flow Examples

### Opening (Always includes UI orientation)
**Assistant:** "Hi there 👋 I'm here to help you find clinical trials in Canada. You'll see your progress at the top, and you can type below, upload medical reports, or use suggestions. The map and trial summaries will appear on the left as we go. Let's take it one step at a time. What type of cancer are you dealing with?"

### Stage Question

**First Time:**
"Can you tell me about the stage? You can say 'early', 'advanced', 'it has spread', or use numbers like 1, 2, 3, or 4 - whatever feels right."

**Subsequent Times (if user updates):**
"What stage is it?"

### Age Question

**First Time:**
"How old are you? If you're more comfortable, you can also say '30s', '40s', or '50s' instead of an exact number."

**Subsequent Times:**
"How old are you?"

### Location Question

**First Time:**
"Which city are you in? You can tell me your city and province, or just a nearby city if that's easier."

**Subsequent Times:**
"Which city are you in?"

### Biomarkers Question (Two-Step Approach)

**First Time - Step 1:**
"Do you know your biomarkers? If you're not sure what biomarkers are, I can explain."
[SUGGESTIONS: "Yes, I know them" | "What are biomarkers?" | "I don't know" | "Skip"]

**If user asks "What are biomarkers?":**
"Biomarkers are genetic markers in your tumor, like EGFR, PD-L1, KRAS, or HER2. They help match you to targeted therapies. Do you know if you have any?"
[SUGGESTIONS: "EGFR positive" | "PD-L1 positive" | "I don't know"]

**Subsequent Times:**
"Do you know your biomarkers?"
[SUGGESTIONS: "EGFR positive" | "I don't know" | "Skip"]

### Diagnosis Date Question

**First Time:**
"Last thing - when were you diagnosed? You can give me the exact date, or say something like '2 years ago', '6 months back', or 'last year' - whatever you remember."

**Subsequent Times:**
"Last thing - when were you diagnosed? You can say 'about 6 months ago' or skip."

## Benefits

1. **Reduces Confusion**: Patients understand they have flexibility in how they answer
2. **Avoids Repetition**: Guidance only shown once, keeping conversation natural
3. **Builds Confidence**: Users know what format is acceptable (e.g., "30s" vs exact age)
4. **Explains Jargon**: Biomarkers explained only when user asks for help
5. **UI Orientation**: Users immediately understand the interface layout
6. **Visual Progress**: Checkmarks show completed steps clearly
7. **Never Assumes**: Chatbot always asks again if user doesn't answer (no silent "Not specified")
8. **Smart Re-asking**: When going back to change something, re-asks any skipped required fields

## Existing Features (Already Working)

✅ **Progress Bar**: Shows 7 steps at the top with visual indicators
✅ **Upload Button**: Paperclip icon for medical report uploads
✅ **Suggestions**: Dynamic chips below the input based on context
✅ **Map Panel**: Shows on the left (60% of right side)
✅ **Trial Summary Panel**: Shows below map (40% of right side)

## Technical Implementation

The AI uses conversation history to track which questions have been asked before:
- Analyzes previous messages to detect if a question type was already asked
- Includes guidance text only on first occurrence
- Maintains natural conversation flow on subsequent interactions
- Handles profile updates gracefully without repeating instructions

## Example Scenarios

### Scenario 1: User Doesn't Answer Location

**Assistant:** "Which city are you in? You can tell me your city and province, or just a nearby city if that's easier."

**User:** "i want to change the stage"

**Assistant:** "Let's go back to the stage. What stage is your [cancer type]?"

**User:** "Stage 4"

**Assistant:** "You still need to tell me your city and province. Which city are you in?"
*(Notice: It re-asks for location instead of showing "Not specified")*

### Scenario 2: User Goes Back After Completing Profile

**Progress Bar Shows:**
- Cancer Type: ✓ (checkmark)
- Stage: ✓ (checkmark)  
- Age: 🔵 (pulsing - current step being updated)
- Location: ✓ (checkmark - keeps checkmark even though we went back)
- Biomarkers: ✓ (checkmark)
- Diagnosis: ✓ (checkmark)

### Scenario 3: Biomarkers Two-Step Approach

**Assistant:** "Do you know your biomarkers? If you're not sure what biomarkers are, I can explain."

**User:** "What are biomarkers?"

**Assistant:** "Biomarkers are genetic markers in your tumor, like EGFR, PD-L1, KRAS, or HER2. They help match you to targeted therapies. Do you know if you have any?"

**User:** "EGFR positive"

**Assistant:** "Great! Last thing - when were you diagnosed?"

**Assistant:** "Hi there 👋 I'm here to help you find clinical trials in Canada. You'll see your progress at the top, and you can type below, upload medical reports, or use suggestions. The map and trial summaries will appear on the left as we go. Let's take it one step at a time. What type of cancer are you dealing with?"

**User:** "Lung cancer"

**Assistant:** "I'm sorry to hear that. Can you tell me about the stage? You can say 'early', 'advanced', 'it has spread', or use numbers like 1, 2, 3, or 4 - whatever feels right."

**User:** "Stage 3"

**Assistant:** "Got it. How old are you? If you're more comfortable, you can also say '30s', '40s', or '50s' instead of an exact number."

**User:** "I'm 58"

**Assistant:** "Which city are you in? You can tell me your city and province, or just a nearby city if that's easier."

**User:** "Toronto"

**Assistant:** "Do you know what biomarkers are? They're genetic markers like EGFR or PD-L1. If you know yours, great - if not, no worries, just say 'I don't know'."

**User:** "EGFR positive"

**Assistant:** "Last thing - when were you diagnosed? You can give me the exact date, or say something like '2 years ago', '6 months back', or 'last year' - whatever you remember."

**User:** "About 6 months ago"

**Assistant:** [Shows confirmation table with all details]

---

If the user later says "Actually, I'm 60 years old":

**Assistant:** "Got it, I've updated your age to 60." *(No repetition of the "30s or 40s" guidance)*

## Files Modified

1. `src/lib/groqService.ts` - Updated SYSTEM_PROMPT with first-time guidance rules
2. `src/contexts/AssistantContext.tsx` - Enhanced welcome message with UI orientation

## No Breaking Changes

All existing functionality remains intact:
- Progress bar continues to work
- File upload continues to work
- Trial matching continues to work
- Map and summary panels continue to work
