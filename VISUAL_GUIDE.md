# Visual Guide - Chatbot Improvements

## Progress Bar Evolution

### Before: Hard to Tell What's Complete
```
┌─────────────────────────────────────────────────────────┐
│ Step 3 of 7                                        43%  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                         │
│  🎗️    📊    👤    📍    🧬    📅    ✓    🔍          │
│ Type  Stage  Age  Loc  Bio  Diag Conf Results         │
└─────────────────────────────────────────────────────────┘
```
**Problem:** All icons look similar, hard to tell what's done

### After: Clear Visual Hierarchy
```
┌─────────────────────────────────────────────────────────┐
│ Step 3 of 7                                        43%  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                         │
│  ✓     ✓    👤    📍    🧬    📅    ✓    🔍          │
│ Type  Stage  Age  Loc  Bio  Diag Conf Results         │
│             ⬆️ pulsing                                  │
└─────────────────────────────────────────────────────────┘
```
**Solution:** 
- ✓ = Completed (green background, shadow)
- 👤 with pulse = Current step (light blue, pulsing border)
- 📍 = Not started (gray background)

## Conversation Flow Improvements

### Scenario 1: First-Time User (Gets Guidance)

```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                            │
│                                                         │
│ Hi there 👋 I'm here to help you find clinical trials  │
│ in Canada. You'll see your progress at the top, and    │
│ you can type below, upload medical reports, or use     │
│ suggestions. The map and trial summaries will appear   │
│ on the left as we go.                                  │
│                                                         │
│ Let's take it one step at a time. What type of cancer  │
│ are you dealing with?                                  │
│                                                         │
│ [Lung cancer] [Breast cancer] [Colorectal cancer]     │
└─────────────────────────────────────────────────────────┘

                        ⬇️

┌─────────────────────────────────────────────────────────┐
│ 👤 User: Prostate cancer                                │
└─────────────────────────────────────────────────────────┘

                        ⬇️

┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                            │
│                                                         │
│ I'm sorry to hear that. Can you tell me about the      │
│ stage? You can say 'early', 'advanced', 'it has       │
│ spread', or use numbers like 1, 2, 3, or 4 -          │
│ whatever feels right.                                  │
│                                                         │
│ [It's early] [Stage 3] [It has spread]                │
└─────────────────────────────────────────────────────────┘
```
**Note:** First time asking stage includes guidance about answer formats

### Scenario 2: Returning User (No Repetition)

```
┌─────────────────────────────────────────────────────────┐
│ 👤 User: I want to change the stage                     │
└─────────────────────────────────────────────────────────┘

                        ⬇️

┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                            │
│                                                         │
│ Let's go back to the stage. What stage is your        │
│ prostate cancer?                                       │
│                                                         │
│ [Stage 1] [Stage 2] [Stage 3] [Stage 4]              │
└─────────────────────────────────────────────────────────┘
```
**Note:** Second time asking stage - NO guidance, just the question

## Biomarkers Two-Step Flow

### Step 1: Ask if They Know
```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                            │
│                                                         │
│ Do you know your biomarkers? If you're not sure what   │
│ biomarkers are, I can explain.                         │
│                                                         │
│ [Yes, I know them] [What are biomarkers?]             │
│ [I don't know] [Skip]                                  │
└─────────────────────────────────────────────────────────┘
```

### Step 2a: User Asks for Explanation
```
┌─────────────────────────────────────────────────────────┐
│ 👤 User: What are biomarkers?                           │
└─────────────────────────────────────────────────────────┘

                        ⬇️

┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                            │
│                                                         │
│ Biomarkers are genetic markers in your tumor, like     │
│ EGFR, PD-L1, KRAS, or HER2. They help match you to    │
│ targeted therapies. Do you know if you have any?       │
│                                                         │
│ [EGFR positive] [PD-L1 positive] [I don't know]       │
└─────────────────────────────────────────────────────────┘
```

### Step 2b: User Knows Them
```
┌─────────────────────────────────────────────────────────┐
│ 👤 User: Yes, I know them                               │
└─────────────────────────────────────────────────────────┘

                        ⬇️

┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                            │
│                                                         │
│ Great! Which biomarkers do you have?                   │
│                                                         │
│ [EGFR positive] [PD-L1 positive] [KRAS] [HER2]        │
└─────────────────────────────────────────────────────────┘
```

## Never Assume "Not Specified"

### ❌ OLD Behavior (Bad)
```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant: Which city are you in?                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 👤 User: i want to change the stage                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant: Let's go back to the stage...            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 👤 User: Stage 4                                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant: Here's what I have:                       │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Cancer Type    │ Prostate cancer              │   │
│ │ Stage          │ 4                            │   │
│ │ Age            │ 45                           │   │
│ │ Location       │ Not specified  ❌ BAD!       │   │
│ │ Biomarkers     │ Not specified                │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```
**Problem:** User never said to skip location, but it shows "Not specified"

### ✅ NEW Behavior (Good)
```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant: Which city are you in?                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 👤 User: i want to change the stage                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant: Let's go back to the stage...            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 👤 User: Stage 4                                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant: You still need to tell me your city and   │
│ province. Which city are you in?  ✅ GOOD!             │
│                                                         │
│ [Toronto] [Vancouver] [Montreal] [Calgary]            │
└─────────────────────────────────────────────────────────┘
```
**Solution:** Chatbot re-asks for location instead of assuming "Not specified"

## Progress Bar States

### State 1: Just Started
```
Step 1 of 7                                        14%
▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

🎗️    📊    👤    📍    🧬    📅    ✓    🔍
Type  Stage  Age  Loc  Bio  Diag Conf Results
⬆️ pulsing
```

### State 2: Halfway Through
```
Step 4 of 7                                        57%
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░

✓     ✓     ✓    📍    🧬    📅    ✓    🔍
Type  Stage  Age  Loc  Bio  Diag Conf Results
                  ⬆️ pulsing
```

### State 3: User Goes Back
```
Step 2 of 7                                        29%
▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

✓     📊    ✓     ✓    🧬    📅    ✓    🔍
Type  Stage  Age  Loc  Bio  Diag Conf Results
      ⬆️ pulsing
      (Age and Location keep checkmarks!)
```

### State 4: Complete
```
Step 7 of 7                                       100%
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

✓     ✓     ✓     ✓     ✓     ✓     ✓    ✓
Type  Stage  Age  Loc  Bio  Diag Conf Results
                                          ⬆️ green!
```

## Confirmation Table

### With Complete Information
```
┌─────────────────────────────────────────────────────────┐
│ Your Profile Summary                                    │
├─────────────────────────────────────────────────────────┤
│ 🎗️  CANCER TYPE        Prostate cancer                 │
├─────────────────────────────────────────────────────────┤
│ 📊  STAGE              4                                │
├─────────────────────────────────────────────────────────┤
│ 👤  AGE                45                               │
├─────────────────────────────────────────────────────────┤
│ 📍  LOCATION           Toronto, Ontario                 │
├─────────────────────────────────────────────────────────┤
│ 🧬  BIOMARKERS         BRCA2                            │
├─────────────────────────────────────────────────────────┤
│ 📅  DIAGNOSIS DATE     About 6 months ago               │
└─────────────────────────────────────────────────────────┘

Does this look right?

[Yes, correct] [Need to change something]
```

### With Explicitly Skipped Fields
```
┌─────────────────────────────────────────────────────────┐
│ Your Profile Summary                                    │
├─────────────────────────────────────────────────────────┤
│ 🎗️  CANCER TYPE        Prostate cancer                 │
├─────────────────────────────────────────────────────────┤
│ 📊  STAGE              4                                │
├─────────────────────────────────────────────────────────┤
│ 👤  AGE                45                               │
├─────────────────────────────────────────────────────────┤
│ 📍  LOCATION           Toronto, Ontario                 │
├─────────────────────────────────────────────────────────┤
│ 🧬  BIOMARKERS         Not specified  ✅ User said skip │
├─────────────────────────────────────────────────────────┤
│ 📅  DIAGNOSIS DATE     Not specified  ✅ User said skip │
└─────────────────────────────────────────────────────────┘

Does this look right?

[Yes, correct] [Need to change something]
```

## Color Coding

### Progress Bar Colors
- **Completed (✓)**: Primary blue (#3b82f6) with shadow
- **Active (pulsing)**: Light blue (#3b82f620) with blue border
- **Pending**: Gray (#e5e7eb)
- **Results (complete)**: Green (#10b981)

### Confirmation Table Colors
- **Cancer Type**: Rose background (#fef2f2)
- **Stage**: Purple background (#faf5ff)
- **Age**: Blue background (#eff6ff)
- **Location**: Teal background (#f0fdfa)
- **Biomarkers**: Amber background (#fffbeb)
- **Diagnosis Date**: Indigo background (#eef2ff)

## Mobile View

```
┌─────────────────────────┐
│ Step 3 of 7        43%  │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░  │
│                         │
│ ✓  ✓  👤 📍 🧬 📅 ✓ 🔍 │
│ T  S  A  L  B  D  C  R  │
│       ⬆️                │
└─────────────────────────┘
```
**Note:** Labels abbreviated on mobile for space

## Accessibility Features

1. **Visual Indicators**: Checkmarks, colors, pulsing
2. **Text Labels**: Each step has a text label
3. **ARIA Labels**: Screen reader friendly
4. **Keyboard Navigation**: Tab through suggestions
5. **High Contrast**: Meets WCAG AA standards
6. **Touch Targets**: 24px minimum (6x6 icons)
