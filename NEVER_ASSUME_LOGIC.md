# Never Assume "Not Specified" Logic

## Problem Statement

Previously, the chatbot would show "Not specified" for fields that the user simply didn't answer yet. This created confusion because:
1. User might have just skipped over the question accidentally
2. User might have changed a previous field and the flow didn't re-ask
3. "Not specified" implies the user explicitly chose not to provide information

## Solution

The chatbot now ONLY marks fields as "Not specified" when the user explicitly says:
- "skip"
- "I don't know"
- "not sure"
- "rather not say"
- "prefer not to say"
- "no idea"

## Implementation Details

### 1. Biomarkers Field

**OLD Behavior:**
```typescript
// Would mark as empty array even if user just didn't answer
const noBiomarkers = ["don't know", "skip", "none"];
if (noBiomarkers.some(p => lower.includes(p))) {
  this.state.biomarkers = [];
}
```

**NEW Behavior:**
```typescript
// Only marks as skipped if user explicitly says so AND we're in biomarker context
const noBiomarkers = ["no biomarkers", "don't know", "skip", "none"];
const inBiomarkerContext = lower.includes("biomarker") || 
  this.history.some(h => h.content.toLowerCase().includes("biomarker"));

if (inBiomarkerContext && noBiomarkers.some(p => lower.includes(p))) {
  if (!this.state.biomarkers) this.state.biomarkers = [];
}
```

### 2. Diagnosis Date Field

**OLD Behavior:**
```typescript
// Would mark as "Not specified" if user said "I don't know" about anything
const skipPhrases = ["skip", "don't know"];
if (skipPhrases.some(p => lower.includes(p))) {
  this.state.diagnosis_date = "Not specified";
}
```

**NEW Behavior:**
```typescript
// Only marks as "Not specified" if in diagnosis context
const skipPhrases = ["skip", "don't know", "not sure"];
const inDiagnosisContext = this.history.some(h => 
  h.content.toLowerCase().includes("when were you") || 
  h.content.toLowerCase().includes("diagnosis date")
);

if (inDiagnosisContext && skipPhrases.some(p => lower.includes(p))) {
  this.state.diagnosis_date = "Not specified";
}
```

### 3. Required Fields (Cancer Type, Stage, Age, Location)

**NEW Behavior:**
```typescript
// Only marks as complete if ALL required fields are actually provided
this.state.isComplete = !!(
  this.state.cancer_type && 
  this.state.disease_stage && 
  this.state.age && 
  (this.state.city || this.state.province)
);
```

**AI Prompt Instructions:**
```
- **NEVER ASSUME "Not specified"** - If user doesn't answer a required field 
  (cancer type, stage, age, location), you MUST ask again
- **ONLY mark as "Not specified"** when user explicitly says "skip", 
  "I don't know", "I'd rather not say", or similar
- **When user changes a field**: Re-ask ALL subsequent required fields 
  that were skipped or not answered
```

## Example Scenarios

### Scenario 1: User Doesn't Answer Location

**Conversation:**
```
Assistant: Which city are you in?
User: i want to change the stage
Assistant: Let's go back to the stage. What stage is your prostate cancer?
User: Stage 4
Assistant: You still need to tell me your city and province. Which city are you in?
```

**What Happens:**
- Location field remains `undefined` (not "Not specified")
- After stage is updated, chatbot re-asks for location
- Confirmation table won't show until location is provided

### Scenario 2: User Explicitly Skips Biomarkers

**Conversation:**
```
Assistant: Do you know your biomarkers?
User: I don't know
Assistant: No problem! Last thing - when were you diagnosed?
```

**What Happens:**
- Biomarkers field set to `[]` (empty array)
- Confirmation table will show "Not specified" for biomarkers
- This is correct because user explicitly said "I don't know"

### Scenario 3: User Says "I don't know" Out of Context

**Conversation:**
```
Assistant: Which city are you in?
User: I don't know the exact address but I'm in Toronto
Assistant: Perfect! Toronto is all I need. Do you know your biomarkers?
```

**What Happens:**
- "I don't know" doesn't trigger skip because it's not about the city itself
- City is extracted as "Toronto"
- Continues to next question normally

## System Prompt Rules

The AI is instructed to:

1. **Always re-ask required fields** if user doesn't provide them
2. **Never show confirmation table** until all required fields are answered
3. **Re-ask skipped fields** when user goes back to change something
4. **Only accept explicit skip phrases** like "skip", "I don't know", "rather not say"

## Benefits

1. **No Silent Assumptions**: User always knows what information is missing
2. **Clear Intent**: "Not specified" only appears when user explicitly chooses not to provide
3. **Better UX**: User isn't surprised by "Not specified" appearing without their knowledge
4. **Complete Profiles**: More likely to get complete information before searching trials
5. **Reduced Errors**: Fewer cases of searching with incomplete profiles

## Edge Cases Handled

### Edge Case 1: User Changes Multiple Fields
```
User completes: Type ✓, Stage ✓, Age ✓, Location (skipped), Biomarkers (skipped)
User says: "I want to change the age"
Chatbot: Updates age, then re-asks for location (required field that was skipped)
```

### Edge Case 2: User Says "Skip" for Optional Field
```
Assistant: Last thing - when were you diagnosed?
User: Skip
Chatbot: Marks diagnosis_date as "Not specified" ✓
Chatbot: Shows confirmation table (all required fields complete)
```

### Edge Case 3: User Provides Partial Information
```
Assistant: Which city are you in?
User: I'm in Ontario
Chatbot: Extracts province = "Ontario", but city is still undefined
Chatbot: Continues (because province is sufficient for location)
```

## Testing Checklist

- [ ] User doesn't answer location → Chatbot re-asks
- [ ] User says "skip" for biomarkers → Shows "Not specified" in table
- [ ] User says "I don't know" about stage → Chatbot re-asks stage
- [ ] User changes age after skipping location → Chatbot re-asks location
- [ ] User says "skip" for diagnosis date → Shows "Not specified" in table
- [ ] User provides partial location (only province) → Chatbot accepts it
- [ ] User says "I don't know" in unrelated context → Doesn't trigger skip
