# Gemini Conversational Demo

This document shows how the new Gemini-powered conversational flow works, following the mentor's guidance.

## Demo Conversation Flow

### Scenario: Patient with Advanced Lung Cancer

**Bot:** Hello! I'm here to help you find clinical trials that match your needs. To get started, I'd like to learn a bit about your condition. What type of cancer have you been diagnosed with?

**User:** I have lung cancer. They tell me it is advanced.

**Bot:** I understand this is a difficult time. Thank you for sharing that with me. Can you tell me what stage your lung cancer is? For example, Stage I, II, III, or IV?

**User:** I'm not sure about the stage number.

**Bot:** That's okay. When you say "advanced," that often means Stage III or IV. Do you know if the cancer has spread to other parts of your body?

**User:** Yes, it has spread.

**Bot:** Thank you for that information. That sounds like it could be Stage IV. How old are you, if you don't mind me asking?

**User:** I'm 68 years old.

**Bot:** Thank you. And where are you located? This will help me find trials near you.

**User:** I live in Toronto.

**Bot:** Perfect. So to summarize: you have lung cancer that has spread (likely Stage IV), you're 68 years old, and you're in Toronto. Let me search for clinical trials that might be a good match for you.

*[System automatically searches and displays matching trials]*

## Key Features Demonstrated

### 1. **One Question at a Time**
- Never overwhelms the patient
- Builds information gradually
- Allows for natural conversation flow

### 2. **Empathetic Responses**
- "I understand this is a difficult time"
- "Thank you for sharing that with me"
- "That's okay" when patient doesn't know something

### 3. **Information Extraction**
- Understands "advanced" = likely Stage IV
- Recognizes "spread" = metastatic/Stage IV
- Extracts age and location naturally

### 4. **Clarification When Needed**
- Asks follow-up questions for unclear responses
- Provides examples (Stage I, II, III, IV)
- Explains medical terms in simple language

### 5. **Automatic Search Trigger**
- Summarizes collected information
- Automatically searches when enough data is gathered
- Seamlessly transitions to trial results

## Alternative Conversation Paths

### Path A: Patient Knows Specific Details
```
User: I have Stage IIIA lung adenocarcinoma, I'm 55, live in Vancouver
Bot: Thank you for providing those details. That's very helpful information...
```

### Path B: Patient Provides Diagnosis Date
```
User: It was back in July.
Bot: Of this year?
User: Yes.
Bot: Do you know what type of lung cancer you have? Typical types are "squamous" and "adenocarcinoma."
```

### Path C: Patient Mentions Biomarkers
```
User: They said I have an EGFR mutation.
Bot: That's important information. EGFR mutations can make you eligible for specific targeted therapies...
```

## Technical Implementation

### Information Extracted
- **Cancer Type:** "lung cancer" → "Lung"
- **Stage:** "advanced", "spread" → "Stage IV"
- **Age:** "68 years old" → 68
- **Location:** "Toronto" → Toronto, Ontario
- **Biomarkers:** "EGFR mutation" → ["EGFR"]

### Search Criteria Built
```javascript
{
  cancer_type: "Lung",
  disease_stage: "Stage IV", 
  age: 68,
  city: "Toronto",
  province: "Ontario",
  biomarkers: ["EGFR"]
}
```

### Trial Matching
1. Filter trials by cancer type and location
2. Rank by suitability score
3. Display top 5 matches with eligibility explanations

## Benefits Over Form-Based Approach

### Traditional Form Problems:
- ❌ Overwhelming 20+ fields
- ❌ Medical jargon confusion
- ❌ Required vs optional unclear
- ❌ No guidance or support

### Conversational Approach Benefits:
- ✅ One question at a time
- ✅ Natural language understanding
- ✅ Empathetic and supportive
- ✅ Explains medical terms
- ✅ Handles uncertainty gracefully
- ✅ Builds profile dynamically

## Error Handling

### API Failures
If Gemini API fails, system falls back to rule-based search:
```
Bot: I'm having trouble with my AI assistant right now. Let me help you search for trials using our standard search. You can tell me about your cancer type, stage, or location.
```

### Missing Information
If user doesn't provide enough details:
```
Bot: I'd like to help you find the best trials. Could you tell me a bit more about your cancer type or stage?
```

### Unclear Responses
If user response is ambiguous:
```
Bot: I want to make sure I understand correctly. When you say [unclear term], do you mean [clarification options]?
```

This conversational approach transforms the clinical trial search from a intimidating form-filling exercise into a supportive, guided conversation that meets patients where they are emotionally and informationally.