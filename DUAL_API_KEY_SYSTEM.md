# Dual API Key System - Automatic Switching

## Overview

The system now intelligently switches between two API keys when rate limits are hit, ensuring uninterrupted service for users.

## How It Works

### Key States

Each API key can be in one of two states:
- **Available** (✅) - Can be used for requests
- **Blocked** (🚫) - Hit rate limit, blocked for 5 minutes

### Switching Logic

```
┌─────────────────────────────────────────────────────────┐
│ User sends message                                      │
└─────────────────────────────────────────────────────────┘
                        ⬇️
┌─────────────────────────────────────────────────────────┐
│ Get current API key (checks which keys are available)   │
└─────────────────────────────────────────────────────────┘
                        ⬇️
┌─────────────────────────────────────────────────────────┐
│ Send request with current key                           │
└─────────────────────────────────────────────────────────┘
                        ⬇️
                   ┌─────────┐
                   │ Success?│
                   └─────────┘
                   /         \
                Yes           No (429)
                 ⬇️             ⬇️
┌──────────────────┐  ┌─────────────────────────────────┐
│ Return response  │  │ Mark current key as BLOCKED     │
│                  │  │ Block time: Now + 5 minutes     │
└──────────────────┘  └─────────────────────────────────┘
                                    ⬇️
                      ┌─────────────────────────────────┐
                      │ Is other key available?         │
                      └─────────────────────────────────┘
                               /         \
                            Yes           No
                             ⬇️             ⬇️
                ┌──────────────────┐  ┌──────────────────┐
                │ Switch to other  │  │ Show error:      │
                │ key and retry    │  │ Both keys blocked│
                └──────────────────┘  └──────────────────┘
                         ⬇️
                ┌──────────────────┐
                │ Return response  │
                └──────────────────┘
```

## Example Scenarios

### Scenario 1: Primary Key Hits Rate Limit

```
Time: 10:00 AM
State: Primary ✅ | Backup ✅
User: "Tell me about lung cancer trials"
→ Uses Primary Key
→ Success ✓

Time: 10:05 AM (many requests later)
State: Primary ✅ | Backup ✅
User: "What about stage 3?"
→ Uses Primary Key
→ Rate Limit! (429)
→ Mark Primary as BLOCKED until 10:10 AM
→ Switch to Backup Key
→ Retry request
→ Success ✓

State: Primary 🚫 (until 10:10) | Backup ✅

Time: 10:06 AM
User: "Show me trials in Toronto"
→ Uses Backup Key (Primary still blocked)
→ Success ✓

Time: 10:11 AM
State: Primary ✅ (cooldown ended) | Backup ✅
User: "What's the nearest trial?"
→ Uses Backup Key (still active)
→ Success ✓

Time: 10:16 AM (after 5-minute reset interval)
State: Primary ✅ | Backup ✅
System: Resets to Primary Key
→ Next request uses Primary Key
```

### Scenario 2: Both Keys Hit Rate Limit

```
Time: 10:00 AM
State: Primary ✅ | Backup ✅

Time: 10:05 AM
Primary hits rate limit
State: Primary 🚫 (until 10:10) | Backup ✅
→ Switches to Backup

Time: 10:07 AM
Backup hits rate limit
State: Primary 🚫 (until 10:10) | Backup 🚫 (until 10:12)
→ Both blocked!

User: "Show me trials"
→ Error: "⏱️ We've hit our API rate limit. Please wait a moment..."

Time: 10:11 AM
State: Primary ✅ (cooldown ended) | Backup 🚫 (until 10:12)
→ Automatically switches back to Primary

User: "Show me trials"
→ Uses Primary Key
→ Success ✓
```

### Scenario 3: Alternating Between Keys

```
Time: 10:00 AM
State: Primary ✅ | Backup ✅

[Many requests on Primary]
Time: 10:05 AM - Primary hits limit
State: Primary 🚫 (until 10:10) | Backup ✅
→ Switch to Backup

[Many requests on Backup]
Time: 10:08 AM - Backup hits limit
State: Primary 🚫 (until 10:10) | Backup 🚫 (until 10:13)
→ Both blocked, show error

Time: 10:11 AM - Primary cooldown ends
State: Primary ✅ | Backup 🚫 (until 10:13)
→ Automatically use Primary

[Many requests on Primary]
Time: 10:12 AM - Primary hits limit again
State: Primary 🚫 (until 10:17) | Backup 🚫 (until 10:13)
→ Both blocked, show error

Time: 10:14 AM - Backup cooldown ends
State: Primary 🚫 (until 10:17) | Backup ✅
→ Automatically use Backup

And so on...
```

## Implementation Details

### State Variables

```typescript
let currentApiKey = GROQ_API_KEY;
let isUsingBackup = false;
let primaryKeyBlocked = false;
let backupKeyBlocked = false;
let primaryKeyBlockedUntil = 0;  // Timestamp
let backupKeyBlockedUntil = 0;   // Timestamp
```

### getApiKey() Function

```typescript
function getApiKey(): string {
  const now = Date.now();
  
  // Check if blocked keys have recovered (5 minutes)
  if (primaryKeyBlocked && now > primaryKeyBlockedUntil) {
    console.log("Primary API key cooldown ended");
    primaryKeyBlocked = false;
  }
  if (backupKeyBlocked && now > backupKeyBlockedUntil) {
    console.log("Backup API key cooldown ended");
    backupKeyBlocked = false;
  }
  
  // If current key is blocked, try to switch
  if (isUsingBackup && backupKeyBlocked && !primaryKeyBlocked) {
    console.log("Backup blocked, switching to primary");
    currentApiKey = GROQ_API_KEY;
    isUsingBackup = false;
  } else if (!isUsingBackup && primaryKeyBlocked && !backupKeyBlocked) {
    console.log("Primary blocked, switching to backup");
    currentApiKey = GROQ_API_KEY_BACKUP;
    isUsingBackup = true;
  }
  
  return currentApiKey;
}
```

### handleRateLimit() Function

```typescript
function handleRateLimit(): boolean {
  const now = Date.now();
  const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
  
  if (isUsingBackup) {
    // Backup key hit rate limit
    backupKeyBlocked = true;
    backupKeyBlockedUntil = now + cooldownPeriod;
    
    // Try to switch to primary if available
    if (!primaryKeyBlocked && GROQ_API_KEY) {
      currentApiKey = GROQ_API_KEY;
      isUsingBackup = false;
      return true; // Successfully switched
    }
  } else {
    // Primary key hit rate limit
    primaryKeyBlocked = true;
    primaryKeyBlockedUntil = now + cooldownPeriod;
    
    // Try to switch to backup if available
    if (!backupKeyBlocked && GROQ_API_KEY_BACKUP) {
      currentApiKey = GROQ_API_KEY_BACKUP;
      isUsingBackup = true;
      return true; // Successfully switched
    }
  }
  
  // Both keys are blocked or no backup available
  return false;
}
```

### Request Flow

```typescript
while (true) {
  try {
    const apiKey = getApiKey(); // Gets available key
    const response = await fetch(GROQ_URL, {
      headers: { "Authorization": `Bearer ${apiKey}` },
      // ... other options
    });
    
    if (response.status === 429) {
      // Rate limit hit
      if (handleRateLimit()) {
        // Successfully switched to other key
        continue; // Retry with new key
      } else {
        // Both keys blocked
        throw new Error("API_RATE_LIMIT: ...");
      }
    }
    
    // Success!
    return response;
  } catch (error) {
    throw error;
  }
}
```

## Console Output Examples

### Successful Switch
```
Console:
> Rate limit hit on chat, attempting to switch API key...
> Primary API key hit rate limit, marking as blocked for 5 minutes
> Switching to backup API key
> Successfully switched to alternate API key, retrying...
> [Request succeeds with backup key]

User sees:
✓ Response received (no error shown)
```

### Both Keys Blocked
```
Console:
> Rate limit hit on chat, attempting to switch API key...
> Backup API key hit rate limit, marking as blocked for 5 minutes
> Both API keys are rate limited

User sees:
⏱️ We've hit our API rate limit. Please wait a moment and try again.
```

### Automatic Recovery
```
Console:
> Primary API key cooldown period ended, marking as available
> Backup blocked, switching back to primary key
> [Next request uses primary key]

User sees:
✓ Normal operation resumes
```

## Benefits

1. **Seamless Experience**: Users don't notice when keys switch
2. **Maximum Uptime**: Doubles the effective rate limit
3. **Automatic Recovery**: Keys automatically become available after cooldown
4. **Smart Switching**: Always uses the available key
5. **Transparent**: Console logs show what's happening

## Configuration

### Environment Variables

```env
# Primary API key (required)
VITE_GROQ_API_KEY=gsk_primary_key_here

# Backup API key (highly recommended)
VITE_GROQ_API_KEY_BACKUP=gsk_backup_key_here
```

### Without Backup Key

If only one key is configured:
- System works normally until rate limit
- Shows error when rate limit hit
- Automatically recovers after 5 minutes

### With Backup Key

If both keys are configured:
- System switches automatically on rate limit
- Users experience minimal disruption
- Effective rate limit is doubled
- Both keys recover independently

## Monitoring

### Get Current Status

```typescript
import { getKeyStatus } from '@/lib/groqService';

const status = getKeyStatus();
console.log(status);
// {
//   isUsingBackup: false,
//   hasBackup: true,
//   primaryBlocked: false,
//   backupBlocked: false,
//   primaryBlockedUntil: 0,
//   backupBlockedUntil: 0
// }
```

### Check If Keys Are Available

```typescript
const status = getKeyStatus();

if (status.primaryBlocked && status.backupBlocked) {
  console.log("Both keys are blocked!");
  console.log(`Primary recovers at: ${new Date(status.primaryBlockedUntil)}`);
  console.log(`Backup recovers at: ${new Date(status.backupBlockedUntil)}`);
} else if (status.primaryBlocked) {
  console.log("Primary blocked, using backup");
} else if (status.backupBlocked) {
  console.log("Backup blocked, using primary");
} else {
  console.log("Both keys available");
}
```

## Testing

### Test 1: Single Key Rate Limit
```bash
# Make many rapid requests with only primary key
# Expected: Error after rate limit
# User sees: "⏱️ We've hit our API rate limit..."
```

### Test 2: Automatic Switch
```bash
# Make many rapid requests with both keys configured
# Expected: Automatic switch to backup when primary hits limit
# User sees: No error, seamless operation
```

### Test 3: Both Keys Blocked
```bash
# Exhaust both keys
# Expected: Error message
# User sees: "⏱️ We've hit our API rate limit..."
```

### Test 4: Automatic Recovery
```bash
# Wait 5 minutes after rate limit
# Expected: Key automatically becomes available
# User sees: Normal operation resumes
```

## Comparison: Old vs New

### Old System (2 Attempts)
```
Attempt 1: Primary Key → Rate Limit
Attempt 2: Backup Key → Success
[No more attempts, backup stays active forever]
```

### New System (Intelligent Switching)
```
Request 1: Primary → Rate Limit → Switch to Backup → Success
Request 2: Backup (still active) → Success
Request 3: Backup → Rate Limit → Switch to Primary → Success
Request 4: Primary (recovered) → Success
[Continues switching as needed]
```

## Rate Limit Details

### Groq Rate Limits (Example)
- Free tier: 30 requests/minute per key
- With 2 keys: Effectively 60 requests/minute
- Cooldown: 5 minutes after hitting limit

### Optimization Tips
1. Use both keys for maximum throughput
2. Monitor console for rate limit warnings
3. Consider upgrading to paid tier if hitting limits frequently
4. Implement request queuing for high-traffic scenarios

## Future Enhancements

1. **Multiple Keys**: Support 3+ API keys
2. **Smart Throttling**: Slow down requests near rate limit
3. **Request Queue**: Queue requests when both keys blocked
4. **Analytics**: Track key usage and rate limit frequency
5. **Predictive Switching**: Switch before hitting limit
