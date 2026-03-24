# Error Messages - Visual Guide

## What Users See

### 1. Rate Limit Error (429)

```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                            │
│                                                         │
│ ⏱️ We've hit our API rate limit. Please wait a moment  │
│ and try again. Our backup system will kick in shortly. │
└─────────────────────────────────────────────────────────┘
```

**When:** Too many requests in short time
**What happens:** System switches to backup API key automatically
**User action:** Wait a moment, system handles it

---

### 2. Authentication Error (401)

```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                            │
│                                                         │
│ 🔑 There's an authentication issue with the AI         │
│ service. Please contact support.                       │
└─────────────────────────────────────────────────────────┘
```

**When:** API key is invalid or expired
**What happens:** Request fails immediately
**User action:** Contact support

---

### 3. Server Error (500/503)

```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                            │
│                                                         │
│ 🔧 The AI service is temporarily unavailable. Please   │
│ try again in a moment.                                 │
└─────────────────────────────────────────────────────────┘
```

**When:** Groq servers are down or overloaded
**What happens:** Request fails, system will retry
**User action:** Wait and try again

---

### 4. Network Error

```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                            │
│                                                         │
│ 🌐 Network connection issue. Please check your         │
│ internet connection and try again.                     │
└─────────────────────────────────────────────────────────┘
```

**When:** User's internet is disconnected
**What happens:** Request can't reach server
**User action:** Check internet connection

---

### 5. File Upload - Rate Limit

```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                            │
│                                                         │
│ ⏱️ We've hit our API rate limit. Please wait a moment  │
│ and try again, or type your details directly instead.  │
└─────────────────────────────────────────────────────────┘
```

**When:** Rate limit hit during file processing
**What happens:** File upload fails
**User action:** Wait or type details manually

---

### 6. File Upload - Processing Error

```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                            │
│                                                         │
│ I had trouble reading that file. Please try a clearer  │
│ image or a different PDF, or just type your details    │
│ directly.                                              │
└─────────────────────────────────────────────────────────┘
```

**When:** File is unreadable or corrupted
**What happens:** Vision AI can't extract data
**User action:** Try different file or type manually

---

## Online/Offline Indicator

### Online (Working)
```
┌─────────────────────────────────────────────────────────┐
│ AI Trial Assistant                          ● Online    │
│ Tell me about your condition                            │
└─────────────────────────────────────────────────────────┘
```
- Green dot
- "Online" text
- Input enabled

### Checking (Verifying)
```
┌─────────────────────────────────────────────────────────┐
│ AI Trial Assistant                      ● Checking...   │
│ Tell me about your condition                            │
└─────────────────────────────────────────────────────────┘
```
- Gray dot (pulsing)
- "Checking..." text
- Input enabled

### Offline (Error)
```
┌─────────────────────────────────────────────────────────┐
│ AI Trial Assistant                          ● Offline   │
│ Tell me about your condition                [Retry]     │
└─────────────────────────────────────────────────────────┘
```
- Red dot
- "Offline" text
- "Retry" button appears
- Input disabled

---

## Error Flow Diagram

```
User Action (Send Message)
         ⬇️
    ┌─────────┐
    │ Try API │
    └─────────┘
         ⬇️
    ┌─────────┐
    │ Success?│
    └─────────┘
    /         \
  Yes          No
   ⬇️           ⬇️
Return      Check Error Type
Result           ⬇️
         ┌───────────────┐
         │ Rate Limit?   │
         └───────────────┘
         /              \
       Yes               No
        ⬇️                ⬇️
   Switch to         Show Specific
   Backup Key        Error Message
        ⬇️                ⬇️
   Retry Request     Set Offline
        ⬇️                ⬇️
   ┌─────────┐      Wait 2 sec
   │ Success?│           ⬇️
   └─────────┘      Recheck Health
   /         \
 Yes          No
  ⬇️           ⬇️
Return      Show Error
Result      to User
```

---

## Console Output (Developer View)

### Rate Limit Hit
```
Console:
> Rate limit hit on chat, retrying with backup key...
> Switching to backup API key due to rate limit
> [Success with backup key]

User sees:
✓ Message sent successfully (no error shown)
```

### Rate Limit on Both Keys
```
Console:
> Rate limit hit on chat, retrying with backup key...
> Switching to backup API key due to rate limit
> Groq error: Error: API_RATE_LIMIT: We've hit our API rate limit...

User sees:
⏱️ We've hit our API rate limit. Please wait a moment and try again.
```

### Authentication Error
```
Console:
> Groq error: Error: API_AUTH_ERROR: API authentication failed...

User sees:
🔑 There's an authentication issue with the AI service. Please contact support.
```

### Network Error
```
Console:
> Chat error: TypeError: Failed to fetch

User sees:
🌐 Network connection issue. Please check your internet connection and try again.
```

---

## Comparison: Before vs After

### Before (Generic)
```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                            │
│                                                         │
│ Sorry, I'm having trouble connecting. Please try       │
│ again.                                                 │
└─────────────────────────────────────────────────────────┘
```
❌ User doesn't know what went wrong
❌ User doesn't know what to do
❌ User doesn't know if it's their fault

### After (Specific)
```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                            │
│                                                         │
│ ⏱️ We've hit our API rate limit. Please wait a moment  │
│ and try again. Our backup system will kick in shortly. │
└─────────────────────────────────────────────────────────┘
```
✅ User knows exactly what happened
✅ User knows what to do (wait)
✅ User knows it's not their fault
✅ User knows system is handling it

---

## Error Message Components

Each error message has:

1. **Emoji** - Visual indicator of error type
   - ⏱️ = Rate limit (time-related)
   - 🔑 = Authentication (access-related)
   - 🔧 = Server error (maintenance-related)
   - 🌐 = Network error (connection-related)

2. **Description** - What went wrong
   - "We've hit our API rate limit"
   - "Authentication issue"
   - "Service temporarily unavailable"
   - "Network connection issue"

3. **Action** - What to do next
   - "Please wait a moment"
   - "Please contact support"
   - "Please try again in a moment"
   - "Please check your internet connection"

4. **Context** (optional) - Additional info
   - "Our backup system will kick in shortly"
   - "Or type your details directly instead"

---

## Mobile View

```
┌─────────────────────────┐
│ AI Trial Assistant      │
│ ● Offline      [Retry]  │
├─────────────────────────┤
│                         │
│ 🤖 Assistant            │
│                         │
│ ⏱️ We've hit our API    │
│ rate limit. Please wait │
│ a moment and try again. │
│                         │
└─────────────────────────┘
```

---

## Accessibility

### Screen Reader Announcements

```
Rate Limit:
"Alert: We've hit our API rate limit. Please wait a moment and try again. 
Our backup system will kick in shortly."

Auth Error:
"Alert: There's an authentication issue with the AI service. 
Please contact support."

Server Error:
"Alert: The AI service is temporarily unavailable. 
Please try again in a moment."

Network Error:
"Alert: Network connection issue. Please check your internet 
connection and try again."
```

### Keyboard Navigation

- Error messages are focusable
- "Retry" button is keyboard accessible
- Tab order: Input → Upload → Send → Retry → Suggestions

---

## Testing Checklist

- [ ] Rate limit shows correct message
- [ ] Backup key switches automatically
- [ ] Auth error shows correct message
- [ ] Server error shows correct message
- [ ] Network error shows correct message
- [ ] File upload errors show correct messages
- [ ] Online indicator updates correctly
- [ ] Offline indicator shows retry button
- [ ] Console logs errors for debugging
- [ ] Screen reader announces errors
- [ ] Mobile view displays correctly
