# Chat Results Limit - 5 Trials Maximum

## Overview
The chat interface now shows a maximum of 5 trial results for every search to keep the interface clean and focused.

## Changes Made

### 1. Search Result Limits
All search types now return exactly 5 results:

- **"Best matches for me"**: Top 5 trials by match score
- **"Find nearest trials"**: Top 5 trials by distance
- **General searches**: Top 5 trials (sorted by match score if user profile exists)

### 2. Updated Messaging
The chat responses now clearly indicate "showing top 5":

**Before:**
```
I found 15 trials that match your criteria (sorted by match score):
[Shows 5 trials]
...and 10 more shown on the map.
```

**After:**
```
I found 5 trials (showing top 5, sorted by match score):
[Shows 5 trials]

Would you like me to explain any of these trials in detail or check your eligibility?
```

### 3. Code Changes

#### ChatPanel.tsx - Search Logic
```typescript
// Nearest trials
found = getNearestTrials(trials, userProfile, 5); // Changed from 10 to 5

// Best matches
found = getRankedByBoth(trials, userProfile).slice(0, 5); // Changed from 10 to 5

// Default search with sorting
found = found
  .map(...)
  .sort(...)
  .slice(0, 5); // Added limit to 5

// Safety check
if (found.length > 5) {
  found = found.slice(0, 5);
}
```

#### generateResponse Function
```typescript
// Updated labels
"(showing top 5, sorted by distance)"
"(showing top 5, sorted by match score)"

// Removed "...and X more" messaging
// Now shows exactly what's returned (5 trials)
```

## Benefits

### 1. **Cleaner Interface**
- Less scrolling in chat
- Easier to read and compare trials
- Focused on the most relevant results

### 2. **Better User Experience**
- Not overwhelming with too many options
- Clear expectation: "top 5"
- Encourages users to refine searches if needed

### 3. **Performance**
- Faster rendering of trial cards
- Less data to process in chat
- Smoother scrolling

### 4. **Map Still Shows All**
- Chat shows 5 trials
- Map displays ALL matching trials
- Users can explore more on the map

## User Flow

1. **User searches**: "Find best matches for me"
2. **Chat shows**: Top 5 trials as cards
3. **Map shows**: All matching trials with pins
4. **User can**:
   - Click trial cards to view details
   - Click map pins to see other trials
   - Refine search for different results
   - Ask to "explain" or "simplify" any of the 5 trials

## Example Scenarios

### Scenario 1: Best Matches
```
User: "Best matches for me"

AI: "Best Matching Trials for You (showing top 5, sorted by match score):

1. Advanced Immunotherapy for Stage III Lung Cancer
   • Match Score: 90%
   • Location: Toronto (0.7 km away)
   ...

[Shows 5 trials total]
```

### Scenario 2: Nearest Trials
```
User: "Find nearest trials"

AI: "Nearest Trials to You (showing top 5, sorted by distance):

1. Chemotherapy Combination for Early Stage Lung Cancer
   • Distance: 3.0 km away
   • Match Score: 40%
   ...

[Shows 5 trials total]
```

### Scenario 3: Specific Search
```
User: "Lung cancer trials in Toronto"

AI: "I found 5 trials (showing top 5, sorted by match score):

1. Precision Immunotherapy for Stage III Lung Cancer
   • Match: 90%
   • Distance: 0.7 km away
   ...

[Shows 5 trials total]

Would you like me to explain any of these trials in detail or check your eligibility?
```

## Technical Details

### Files Modified
- `src/components/ChatPanel.tsx`
  - Line ~467: `getNearestTrials(trials, userProfile, 5)`
  - Line ~470: `.slice(0, 5)` for best matches
  - Line ~485: `.slice(0, 5)` for default sorting
  - Line ~490: Safety check for 5 max
  - Line ~277: Updated "nearest" response
  - Line ~289: Updated "best" response
  - Line ~310: Updated general response

### Constants
```typescript
const MAX_CHAT_RESULTS = 5; // Could be extracted as constant
```

### Future Enhancements
- Add "Show more" button to load next 5
- Allow users to configure result limit in settings
- Add pagination for large result sets
- Show total count: "Showing 5 of 15 trials"

## Testing Checklist

- [x] "Best matches" returns 5 trials
- [x] "Nearest trials" returns 5 trials
- [x] General search returns 5 trials
- [x] Map still shows all trials
- [x] Trial cards render correctly
- [x] Messaging is clear and accurate
- [x] No "...and X more" confusion
- [x] Explain/simplify/compare still work
