# Error Handling Improvements

## Overview

The chatbot now displays user-friendly error messages for different types of API errors, including rate limits, authentication issues, and server errors.

## Error Types & Messages

### 1. API Rate Limit (429)
**When it happens:** Too many requests to the Groq API

**User sees:**
```
⏱️ We've hit our API rate limit. Please wait a moment and try again. 
Our backup system will kick in shortly.
```

**What happens behind the scenes:**
1. Primary API key hits rate limit
2. System automatically switches to backup API key
3. Request is retried with backup key
4. If backup also fails, user sees the message above
5. System resets to primary key after 5 minutes

### 2. Authentication Error (401)
**When it happens:** API key is invalid or expired

**User sees:**
```
🔑 There's an authentication issue with the AI service. 
Please contact support.
```

**What to do:**
- Check that `VITE_GROQ_API_KEY` is set correctly in `.env`
- Verify the API key is valid at https://console.groq.com/keys
- Check that the key hasn't expired

### 3. Server Error (500, 503)
**When it happens:** Groq's servers are down or overloaded

**User sees:**
```
🔧 The AI service is temporarily unavailable. 
Please try again in a moment.
```

**What to do:**
- Wait a few minutes and try again
- Check Groq's status page for outages
- System will automatically retry

### 4. Network Error
**When it happens:** User's internet connection is down

**User sees:**
```
🌐 Network connection issue. Please check your internet 
connection and try again.
```

**What to do:**
- Check internet connection
- Try refreshing the page
- Check if other websites work

### 5. File Upload Errors

#### Rate Limit on File Upload
**User sees:**
```
⏱️ We've hit our API rate limit. Please wait a moment and 
try again, or type your details directly instead.
```

#### File Processing Error
**User sees:**
```
I had trouble reading that file. Please try a clearer image 
or a different PDF, or just type your details directly.
```

## Implementation Details

### In `groqService.ts`

```typescript
// Check response status and throw specific errors
if (!res.ok) {
  if (res.status === 429 && attempt === 0 && switchToBackupKey()) {
    console.log("Rate limit hit, retrying with backup key...");
    continue;
  }
  
  // Provide user-friendly error messages
  if (res.status === 429) {
    throw new Error("API_RATE_LIMIT: We've hit our API rate limit...");
  } else if (res.status === 401) {
    throw new Error("API_AUTH_ERROR: API authentication failed...");
  } else if (res.status === 500 || res.status === 503) {
    throw new Error("API_SERVER_ERROR: The AI service is temporarily unavailable...");
  }
}
```

### In `ChatPanel.tsx`

```typescript
catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  let userMessage = "Sorry, I'm having trouble connecting...";
  
  if (errorMessage.includes("API_RATE_LIMIT")) {
    userMessage = "⏱️ We've hit our API rate limit...";
  } else if (errorMessage.includes("API_AUTH_ERROR")) {
    userMessage = "🔑 There's an authentication issue...";
  } else if (errorMessage.includes("API_SERVER_ERROR")) {
    userMessage = "🔧 The AI service is temporarily unavailable...";
  } else if (errorMessage.includes("NetworkError")) {
    userMessage = "🌐 Network connection issue...";
  }
  
  setMessages(prev => [...prev, { 
    id: Date.now().toString(), 
    role: "assistant", 
    content: userMessage 
  }]);
}
```

## Error Message Format

All error messages follow this pattern:
```
[EMOJI] [Brief description]. [What to do next].
```

Examples:
- ⏱️ Rate limit → Wait and retry
- 🔑 Auth error → Contact support
- 🔧 Server error → Try again later
- 🌐 Network error → Check connection

## Dual API Key System

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│ User sends message                                      │
└─────────────────────────────────────────────────────────┘
                        ⬇️
┌─────────────────────────────────────────────────────────┐
│ Try with Primary API Key                                │
└─────────────────────────────────────────────────────────┘
                        ⬇️
                   ┌─────────┐
                   │ Success?│
                   └─────────┘
                   /         \
                Yes           No (429)
                 ⬇️             ⬇️
┌──────────────────┐  ┌─────────────────────────────────┐
│ Return response  │  │ Switch to Backup API Key        │
└──────────────────┘  └─────────────────────────────────┘
                                    ⬇️
                      ┌─────────────────────────────────┐
                      │ Retry with Backup Key           │
                      └─────────────────────────────────┘
                                    ⬇️
                               ┌─────────┐
                               │ Success?│
                               └─────────┘
                               /         \
                            Yes           No
                             ⬇️             ⬇️
                ┌──────────────────┐  ┌──────────────────┐
                │ Return response  │  │ Show error to    │
                │                  │  │ user             │
                └──────────────────┘  └──────────────────┘
```

### Auto-Recovery

Every 5 minutes, the system attempts to reset to the primary API key:

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    resetToPrimaryKey();
  }, 5 * 60 * 1000); // 5 minutes
  
  return () => clearInterval(interval);
}, []);
```

## Online/Offline Indicator

The UI shows the current connection status:

```
┌─────────────────────────────────────────────────────────┐
│ AI Trial Assistant                          ● Online    │
│ Tell me about your condition                            │
└─────────────────────────────────────────────────────────┘
```

States:
- **● Online** (green) - Connected and working
- **● Checking...** (gray, pulsing) - Verifying connection
- **● Offline** (red) - Connection failed

## Testing Error Scenarios

### Test 1: Rate Limit
```bash
# Make many rapid requests to trigger rate limit
# Expected: Automatic switch to backup key
# User sees: Brief message, then continues working
```

### Test 2: Invalid API Key
```bash
# Set invalid API key in .env
VITE_GROQ_API_KEY=invalid_key_here

# Expected: Authentication error
# User sees: "🔑 There's an authentication issue..."
```

### Test 3: Network Offline
```bash
# Disconnect internet
# Expected: Network error
# User sees: "🌐 Network connection issue..."
```

### Test 4: Server Error
```bash
# Groq servers return 500/503
# Expected: Server error message
# User sees: "🔧 The AI service is temporarily unavailable..."
```

## Error Recovery Flow

```
Error Occurs
    ⬇️
Log to Console (for debugging)
    ⬇️
Parse Error Type
    ⬇️
Generate User-Friendly Message
    ⬇️
Display to User
    ⬇️
Set Offline Status
    ⬇️
Record Error Time
    ⬇️
Wait 2 seconds
    ⬇️
Recheck Connection
    ⬇️
Update Status
```

## Console Logging

All errors are logged to console for debugging:

```javascript
console.error("Chat error:", error);
// Output: Chat error: Error: API_RATE_LIMIT: We've hit our API rate limit...

console.log("Rate limit hit on chat, retrying with backup key...");
// Output: Rate limit hit on chat, retrying with backup key...

console.log("Switching to backup API key due to rate limit");
// Output: Switching to backup API key due to rate limit
```

## User Experience

### Before (Generic Error)
```
User: "Tell me about lung cancer trials"
Bot: "Sorry, I'm having trouble connecting. Please try again."
```
**Problem:** User doesn't know what went wrong or what to do

### After (Specific Error)
```
User: "Tell me about lung cancer trials"
Bot: "⏱️ We've hit our API rate limit. Please wait a moment 
      and try again. Our backup system will kick in shortly."
```
**Solution:** User knows exactly what happened and what to expect

## Configuration

### Environment Variables

```env
# Primary API key (required)
VITE_GROQ_API_KEY=your_primary_key_here

# Backup API key (recommended)
VITE_GROQ_API_KEY_BACKUP=your_backup_key_here
```

### Without Backup Key

If no backup key is configured:
1. Rate limit error shows immediately
2. No automatic retry
3. User must wait for rate limit to reset

### With Backup Key

If backup key is configured:
1. Rate limit triggers automatic switch
2. Request retries immediately
3. User experiences minimal disruption
4. System resets to primary after 5 minutes

## Benefits

1. **Transparency**: Users know exactly what's happening
2. **Actionable**: Users know what to do next
3. **Professional**: Polished error messages with emojis
4. **Resilient**: Automatic fallback to backup key
5. **Debuggable**: Console logs for developers
6. **User-Friendly**: No technical jargon

## Files Modified

1. **src/lib/groqService.ts**
   - Added specific error types (API_RATE_LIMIT, API_AUTH_ERROR, etc.)
   - Improved error throwing with context
   - Preserved error messages through retry logic

2. **src/components/ChatPanel.tsx**
   - Added error message parsing
   - Display user-friendly messages based on error type
   - Added emoji indicators for different error types

## Future Enhancements

1. **Retry Button**: Add a "Retry" button to error messages
2. **Error Analytics**: Track error frequency and types
3. **Smart Throttling**: Automatically slow down requests near rate limit
4. **Queue System**: Queue messages when rate limited
5. **Status Page**: Link to Groq status page in server errors
