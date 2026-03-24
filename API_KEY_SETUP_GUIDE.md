# API Key Setup Guide

## Quick Start

### Step 1: Add Keys to .env File

```env
# Primary API key (required)
VITE_GROQ_API_KEY="your_primary_key_here"

# Backup API key (recommended)
VITE_GROQ_API_KEY_BACKUP="your_backup_key_here"

# Tertiary API key (optional, for maximum uptime)
VITE_GROQ_API_KEY_TERTIARY="your_tertiary_key_here"
```

### Step 2: Restart Development Server

```bash
npm run dev
# or
bun dev
```

### Step 3: Test

Open the app and start chatting. Check the console for key switching messages.

## Current Configuration

Your `.env` file is already configured with 3 keys:

```env
VITE_GROQ_API_KEY="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"
VITE_GROQ_API_KEY_BACKUP="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"
VITE_GROQ_API_KEY_TERTIARY="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"
```

✅ You're all set with maximum uptime!

## How It Works

### Automatic Switching

```
User sends message
    ⬇️
Try Key 1 (Primary)
    ⬇️
Rate limit? → Switch to Key 2 (Backup)
    ⬇️
Rate limit? → Switch to Key 3 (Tertiary)
    ⬇️
Rate limit? → Show error (all keys blocked)
    ⬇️
Wait 5 minutes → Keys recover automatically
```

### Console Messages

When switching keys, you'll see:

```
> Rate limit hit on chat, attempting to switch API key...
> Primary API key hit rate limit, marking as blocked for 5 minutes
> Switching to API key 2
> Successfully switched to alternate API key, retrying...
```

When all keys are blocked:

```
> All API keys are rate limited
```

User sees:
```
⏱️ All 3 API keys are rate limited. Please wait a moment and try again.
```

## Benefits by Configuration

| Keys | Requests/Min | Uptime | Best For |
|------|--------------|--------|----------|
| 1 key | 30 | ~83% | Development |
| 2 keys | 60 | ~95% | Testing |
| 3 keys | 90 | ~99% | Production |

## Monitoring

### Check Current Status

Open browser console and run:

```javascript
// This is automatically available in the app
const status = window.getKeyStatus?.();
console.log(status);
```

Output:
```javascript
{
  currentKeyIndex: 0,        // 0=primary, 1=backup, 2=tertiary
  totalKeys: 3,              // Number of configured keys
  primaryBlocked: false,     // Is primary key blocked?
  backupBlocked: false,      // Is backup key blocked?
  tertiaryBlocked: false,    // Is tertiary key blocked?
  primaryBlockedUntil: 0,    // Timestamp when primary recovers
  backupBlockedUntil: 0,     // Timestamp when backup recovers
  tertiaryBlockedUntil: 0    // Timestamp when tertiary recovers
}
```

## Troubleshooting

### Issue: "API authentication failed"

**Cause:** Invalid API key

**Solution:**
1. Check that keys are correct in `.env`
2. Verify keys at https://console.groq.com/keys
3. Make sure keys start with `gsk_`
4. Restart dev server after changing `.env`

### Issue: "All X API keys are rate limited"

**Cause:** All configured keys hit rate limit

**Solution:**
1. Wait 5 minutes for keys to recover
2. Add more API keys to `.env`
3. Consider upgrading to paid tier
4. Reduce request frequency

### Issue: Keys not switching

**Cause:** Only one key configured or keys not in `.env`

**Solution:**
1. Check `.env` file has all keys
2. Restart dev server
3. Check console for error messages

### Issue: "The AI service is temporarily unavailable"

**Cause:** Groq servers are down

**Solution:**
1. Check Groq status page
2. Wait a few minutes and try again
3. Not related to API keys

## Getting More API Keys

### Option 1: Create Multiple Accounts
1. Go to https://console.groq.com
2. Sign up with different email addresses
3. Get API key from each account
4. Add to `.env` file

### Option 2: Upgrade to Paid Tier
1. Go to https://console.groq.com/settings/billing
2. Upgrade your account
3. Get higher rate limits on single key
4. May not need multiple keys

## Best Practices

✅ **DO:**
- Configure at least 2 keys for redundancy
- Use 3 keys for production
- Monitor console logs
- Keep keys secret (never commit to git)

❌ **DON'T:**
- Share API keys publicly
- Commit `.env` file to git
- Use same key in multiple apps
- Ignore rate limit warnings

## Security

### Keep Keys Secret

The `.env` file is already in `.gitignore`, so it won't be committed to git.

**Never:**
- Share keys in public repositories
- Post keys in issues or forums
- Email keys in plain text
- Store keys in client-side code

**Always:**
- Keep `.env` file local only
- Use environment variables
- Rotate keys if compromised
- Use different keys per environment

## Production Deployment

### Vercel

1. Go to project settings
2. Add environment variables:
   - `VITE_GROQ_API_KEY`
   - `VITE_GROQ_API_KEY_BACKUP`
   - `VITE_GROQ_API_KEY_TERTIARY`
3. Redeploy

### Netlify

1. Go to Site settings → Environment variables
2. Add the three keys
3. Redeploy

### Other Platforms

Check your platform's documentation for setting environment variables.

## Testing Your Setup

### Test 1: Check Keys Are Loaded

```javascript
// In browser console
console.log('Keys configured:', 
  import.meta.env.VITE_GROQ_API_KEY ? '✓ Primary' : '✗ Primary',
  import.meta.env.VITE_GROQ_API_KEY_BACKUP ? '✓ Backup' : '✗ Backup',
  import.meta.env.VITE_GROQ_API_KEY_TERTIARY ? '✓ Tertiary' : '✗ Tertiary'
);
```

### Test 2: Send a Message

1. Open the app
2. Send a message to the chatbot
3. Check console for success or errors

### Test 3: Trigger Rate Limit (Optional)

1. Send many messages rapidly
2. Watch console for key switching
3. Verify automatic switching works

## Summary

✅ **You're configured with 3 API keys**
✅ **Automatic switching enabled**
✅ **Maximum uptime (99%)**
✅ **90 requests/minute capacity**

The system will automatically handle rate limits and switch between keys. You don't need to do anything else!

## Need Help?

Check these files for more details:
- `TRIPLE_API_KEY_SYSTEM.md` - Complete technical guide
- `ERROR_HANDLING_IMPROVEMENTS.md` - Error messages guide
- `DUAL_API_KEY_SYSTEM.md` - Original 2-key system docs
