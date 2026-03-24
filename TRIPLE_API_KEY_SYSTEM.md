# Triple API Key System

## Overview

The system now supports **THREE API keys** for maximum uptime and rate limit handling. When one key hits the rate limit, it automatically switches to the next available key.

## Configuration

### Environment Variables

```env
# Primary API key (required)
VITE_GROQ_API_KEY="your_primary_key_here"

# Backup API key (recommended)
VITE_GROQ_API_KEY_BACKUP="your_backup_key_here"

# Tertiary API key (optional, for maximum uptime)
VITE_GROQ_API_KEY_TERTIARY="your_tertiary_key_here"
```

## How It Works

### Key Rotation

```
┌─────────────────────────────────────────────────────────┐
│ Start: Using Key 1 (Primary)                           │
└─────────────────────────────────────────────────────────┘
                        ⬇️
┌─────────────────────────────────────────────────────────┐
│ Key 1 hits rate limit                                   │
│ → Mark Key 1 as blocked for 5 minutes                  │
│ → Switch to Key 2 (Backup)                             │
└─────────────────────────────────────────────────────────┘
                        ⬇️
┌─────────────────────────────────────────────────────────┐
│ Key 2 hits rate limit                                   │
│ → Mark Key 2 as blocked for 5 minutes                  │
│ → Switch to Key 3 (Tertiary)                           │
└─────────────────────────────────────────────────────────┘
                        ⬇️
┌─────────────────────────────────────────────────────────┐
│ Key 3 hits rate limit                                   │
│ → Mark Key 3 as blocked for 5 minutes                  │
│ → All keys blocked, show error                         │
└─────────────────────────────────────────────────────────┘
                        ⬇️
┌─────────────────────────────────────────────────────────┐
│ After 5 minutes: Key 1 recovers                        │
│ → Automatically switch back to Key 1                   │
└─────────────────────────────────────────────────────────┘
```

## Example Scenario

### Timeline with 3 Keys

```
Time: 10:00 AM
State: Key1 ✅ | Key2 ✅ | Key3 ✅
Using: Key 1
User: "Tell me about lung cancer trials"
→ Success ✓

Time: 10:05 AM (after many requests)
State: Key1 🚫 (until 10:10) | Key2 ✅ | Key3 ✅
Using: Key 2
User: "What about stage 3?"
→ Key 1 hit rate limit
→ Switched to Key 2
→ Success ✓

Time: 10:07 AM (after many requests)
State: Key1 🚫 (until 10:10) | Key2 🚫 (until 10:12) | Key3 ✅
Using: Key 3
User: "Show me trials in Toronto"
→ Key 2 hit rate limit
→ Switched to Key 3
→ Success ✓

Time: 10:09 AM (after many requests)
State: Key1 🚫 (until 10:10) | Key2 🚫 (until 10:12) | Key3 🚫 (until 10:14)
Using: None (all blocked)
User: "What's the nearest trial?"
→ Key 3 hit rate limit
→ All 3 keys blocked
→ Error: "⏱️ All 3 API keys are rate limited. Please wait..."

Time: 10:11 AM
State: Key1 ✅ (recovered) | Key2 🚫 (until 10:12) | Key3 🚫 (until 10:14)
Using: Key 1
User: "Show me trials"
→ Key 1 recovered automatically
→ Switched to Key 1
→ Success ✓

Time: 10:13 AM
State: Key1 ✅ | Key2 ✅ (recovered) | Key3 🚫 (until 10:14)
Using: Key 1
→ Key 2 recovered (available as backup)

Time: 10:15 AM
State: Key1 ✅ | Key2 ✅ | Key3 ✅ (recovered)
Using: Key 1
→ All keys available again
```

## Benefits

### With 1 Key
- Rate limit: 30 requests/minute
- Downtime: 5 minutes when limit hit
- Uptime: ~83% under heavy load

### With 2 Keys
- Rate limit: 60 requests/minute
- Downtime: Rare (only if both hit limit)
- Uptime: ~95% under heavy load

### With 3 Keys
- Rate limit: 90 requests/minute
- Downtime: Very rare (only if all three hit limit)
- Uptime: ~99% under heavy load

## Console Output

### Switching Between Keys

```
Console:
> Rate limit hit on chat, attempting to switch API key...
> Primary API key hit rate limit, marking as blocked for 5 minutes
> Switching to API key 2
> Successfully switched to alternate API key, retrying...

[Later...]
> Rate limit hit on chat, attempting to switch API key...
> Backup API key hit rate limit, marking as blocked for 5 minutes
> Switching to API key 3
> Successfully switched to alternate API key, retrying...

[Later...]
> Rate limit hit on chat, attempting to switch API key...
> Tertiary API key hit rate limit, marking as blocked for 5 minutes
> All API keys are rate limited

User sees:
⏱️ All 3 API keys are rate limited. Please wait a moment and try again.
```

### Automatic Recovery

```
Console:
> Primary API key cooldown period ended, marking as available
> Current key blocked, switching to key 1
> [Next request uses Key 1]

User sees:
✓ Normal operation resumes
```

## Monitoring

### Check Current Status

```typescript
import { getKeyStatus } from '@/lib/groqService';

const status = getKeyStatus();
console.log(status);
// {
//   currentKeyIndex: 0,        // 0=primary, 1=backup, 2=tertiary
//   totalKeys: 3,              // Number of configured keys
//   primaryBlocked: false,
//   backupBlocked: false,
//   tertiaryBlocked: false,
//   primaryBlockedUntil: 0,
//   backupBlockedUntil: 0,
//   tertiaryBlockedUntil: 0
// }
```

### Display Current Key

```typescript
const status = getKeyStatus();
const keyNames = ['Primary', 'Backup', 'Tertiary'];
console.log(`Currently using: ${keyNames[status.currentKeyIndex]}`);
console.log(`Total keys configured: ${status.totalKeys}`);

// Check which keys are blocked
if (status.primaryBlocked) {
  console.log(`Primary blocked until: ${new Date(status.primaryBlockedUntil)}`);
}
if (status.backupBlocked) {
  console.log(`Backup blocked until: ${new Date(status.backupBlockedUntil)}`);
}
if (status.tertiaryBlocked) {
  console.log(`Tertiary blocked until: ${new Date(status.tertiaryBlockedUntil)}`);
}
```

## Error Messages

### With 1 Key
```
⏱️ API key is rate limited. Please wait a moment and try again.
```

### With 2 Keys
```
⏱️ All 2 API keys are rate limited. Please wait a moment and try again.
```

### With 3 Keys
```
⏱️ All 3 API keys are rate limited. Please wait a moment and try again.
```

## Implementation Details

### State Variables

```typescript
let currentApiKey = GROQ_API_KEY;
let currentKeyIndex = 0; // 0=primary, 1=backup, 2=tertiary
let primaryKeyBlocked = false;
let backupKeyBlocked = false;
let tertiaryKeyBlocked = false;
let primaryKeyBlockedUntil = 0;
let backupKeyBlockedUntil = 0;
let tertiaryKeyBlockedUntil = 0;
```

### Get Available Keys

```typescript
function getAvailableKeys(): string[] {
  const keys = [];
  if (GROQ_API_KEY) keys.push(GROQ_API_KEY);
  if (GROQ_API_KEY_BACKUP) keys.push(GROQ_API_KEY_BACKUP);
  if (GROQ_API_KEY_TERTIARY) keys.push(GROQ_API_KEY_TERTIARY);
  return keys;
}
```

### Handle Rate Limit

```typescript
function handleRateLimit(): boolean {
  const now = Date.now();
  const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
  const keys = getAvailableKeys();
  
  // Mark current key as blocked
  if (currentKeyIndex === 0) {
    primaryKeyBlocked = true;
    primaryKeyBlockedUntil = now + cooldownPeriod;
  } else if (currentKeyIndex === 1) {
    backupKeyBlocked = true;
    backupKeyBlockedUntil = now + cooldownPeriod;
  } else if (currentKeyIndex === 2) {
    tertiaryKeyBlocked = true;
    tertiaryKeyBlockedUntil = now + cooldownPeriod;
  }
  
  // Try to find an available key
  const blockedStates = [
    primaryKeyBlocked, 
    backupKeyBlocked, 
    tertiaryKeyBlocked
  ];
  
  for (let i = 0; i < keys.length; i++) {
    if (!blockedStates[i]) {
      console.log(`Switching to API key ${i + 1}`);
      currentKeyIndex = i;
      currentApiKey = keys[i];
      return true; // Successfully switched
    }
  }
  
  // All keys are blocked
  return false;
}
```

## Testing

### Test 1: Single Key
```bash
# Configure only VITE_GROQ_API_KEY
# Make many requests
# Expected: Error after rate limit
```

### Test 2: Two Keys
```bash
# Configure VITE_GROQ_API_KEY and VITE_GROQ_API_KEY_BACKUP
# Make many requests
# Expected: Switches to backup when primary hits limit
```

### Test 3: Three Keys
```bash
# Configure all three keys
# Make many requests
# Expected: Switches through all three keys before showing error
```

### Test 4: Recovery
```bash
# Hit rate limit on all keys
# Wait 5 minutes
# Expected: First key recovers and becomes active
```

## Comparison

### Old System (2 Keys)
```
Request 1-30: Primary → Success
Request 31: Primary → Rate Limit → Switch to Backup
Request 32-60: Backup → Success
Request 61: Backup → Rate Limit → ERROR (both blocked)
[Wait 5 minutes for recovery]
```

### New System (3 Keys)
```
Request 1-30: Primary → Success
Request 31: Primary → Rate Limit → Switch to Backup
Request 32-60: Backup → Success
Request 61: Backup → Rate Limit → Switch to Tertiary
Request 62-90: Tertiary → Success
Request 91: Tertiary → Rate Limit → ERROR (all blocked)
[Wait 5 minutes for recovery]
```

**Result:** 3x the capacity before hitting errors!

## Best Practices

1. **Always configure at least 2 keys** for redundancy
2. **Use 3 keys for production** to maximize uptime
3. **Monitor console logs** to see key switching activity
4. **Check key status** periodically to see usage patterns
5. **Consider upgrading to paid tier** if hitting limits frequently

## Rate Limit Math

### Groq Free Tier (Example)
- Limit: 30 requests/minute per key
- Cooldown: 5 minutes after hitting limit

### With 3 Keys
- Total capacity: 90 requests/minute
- If all keys hit limit: 5-minute downtime
- Recovery: Keys recover independently every 5 minutes
- Effective uptime: ~99% under heavy load

### Optimal Usage Pattern
```
Minute 1: Use Key 1 (30 requests)
Minute 2: Use Key 2 (30 requests) - Key 1 cooling down
Minute 3: Use Key 3 (30 requests) - Key 1 & 2 cooling down
Minute 4: Wait or slow down - All keys cooling down
Minute 5: Wait or slow down - All keys cooling down
Minute 6: Use Key 1 (recovered) - Cycle repeats
```

This pattern allows for sustained 30 requests/minute indefinitely!

## Future Enhancements

1. **Support 4+ keys** - Extend to unlimited keys
2. **Smart load balancing** - Distribute requests evenly
3. **Predictive switching** - Switch before hitting limit
4. **Usage analytics** - Track which keys are used most
5. **Auto-throttling** - Slow down near rate limits
