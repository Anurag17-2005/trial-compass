# Quick Reference - Chatbot Improvements

## What Changed?

### 1. Progress Bar ✅
- **Before**: All icons, hard to tell what's done
- **After**: Checkmarks (✓) for completed steps, pulsing icon for current step

### 2. Never Assume ✅
- **Before**: Shows "Not specified" even if user didn't answer
- **After**: Re-asks the question until user explicitly skips

### 3. Biomarkers ✅
- **Before**: Explains biomarkers immediately
- **After**: Asks if they know first, explains only if they ask

### 4. First-Time Guidance ✅
- **Before**: Same message every time
- **After**: Helpful context first time, brief question after

## Visual States

| State | Icon | Meaning |
|-------|------|---------|
| ✓ | Checkmark | Completed step |
| 👤 (pulsing) | Icon with border | Current step |
| 📍 | Gray icon | Not started |

## Key Rules

### For Developers

1. **Never mark as "Not specified"** unless user says:
   - "skip"
   - "I don't know"
   - "not sure"
   - "rather not say"

2. **Always re-ask** required fields if user doesn't answer

3. **Check context** before marking as skipped:
   ```typescript
   const inContext = this.history.some(h => 
     h.content.toLowerCase().includes("keyword")
   );
   ```

4. **Show checkmarks** for completed steps:
   ```tsx
   {done ? "✓" : active ? step.icon : step.icon}
   ```

### For Users

1. **Progress bar** shows your completion status
2. **Checkmarks** mean that step is done
3. **Pulsing icon** means that's the current step
4. **You can go back** to change any field
5. **Say "skip"** if you don't want to answer optional questions

## Conversation Patterns

### Pattern 1: Normal Flow
```
Q: What type of cancer?
A: Lung cancer
✓ Cancer Type

Q: What stage? (with guidance first time)
A: Stage 3
✓ Stage

Q: How old are you? (with guidance first time)
A: 58
✓ Age

... continues ...
```

### Pattern 2: Going Back
```
Current: ✓ ✓ ✓ 📍 (at Location)
User: "I want to change the stage"
New: ✓ 📊 ✓ 📍 (back to Stage, Age keeps ✓)
```

### Pattern 3: Skipping
```
Q: Do you know your biomarkers?
A: "I don't know"
→ Marks as "Not specified" ✅

Q: Which city are you in?
A: "i want to change the stage"
→ Does NOT mark as "Not specified" ❌
→ Re-asks after stage is updated ✅
```

### Pattern 4: Biomarkers
```
Q: Do you know your biomarkers? If you're not sure what biomarkers are, I can explain.
A: "What are biomarkers?"
→ Explains: "Biomarkers are genetic markers..."
Q: Do you know if you have any?
A: "EGFR positive"
✓ Biomarkers
```

## Files Modified

| File | What Changed |
|------|--------------|
| `src/lib/groqService.ts` | System prompt, extraction logic, context checking |
| `src/components/ChatPanel.tsx` | Progress bar UI, checkmarks, sizing |
| `src/contexts/AssistantContext.tsx` | Welcome message with UI orientation |

## Testing Checklist

- [ ] Checkmarks appear for completed steps
- [ ] Current step pulses
- [ ] Going back keeps previous checkmarks
- [ ] Location re-asked if not answered
- [ ] Biomarkers shows "Not specified" only when user says "skip"
- [ ] Diagnosis date shows "Not specified" only when user says "skip"
- [ ] First-time guidance appears for each question type
- [ ] Second-time guidance is brief (no repetition)
- [ ] Biomarkers explanation only when user asks

## Common Issues & Solutions

### Issue 1: "Not specified" appearing without user skipping
**Solution**: Check that context detection is working:
```typescript
const inContext = this.history.some(h => 
  h.content.toLowerCase().includes("biomarker")
);
```

### Issue 2: Checkmarks not appearing
**Solution**: Check that `done` condition is correct:
```tsx
const done = currentStep > idx || searchDone;
```

### Issue 3: Guidance repeating
**Solution**: AI should track conversation history to detect if question was asked before

### Issue 4: Progress bar not going back
**Solution**: Check that `getStepIndex()` correctly calculates current step based on state

## Quick Commands

### Run Development Server
```bash
npm run dev
# or
bun dev
```

### Check for Errors
```bash
npm run lint
```

### Build for Production
```bash
npm run build
```

## Support

For questions or issues:
1. Check `IMPLEMENTATION_SUMMARY.md` for detailed info
2. Check `VISUAL_GUIDE.md` for visual examples
3. Check `NEVER_ASSUME_LOGIC.md` for logic details
4. Check `PROGRESS_BAR_IMPROVEMENTS.md` for UI details
