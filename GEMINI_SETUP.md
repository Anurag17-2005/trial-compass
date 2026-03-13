# Gemini API 2.5 Flash Integration Guide

This application now uses Google's Gemini 1.5 Flash API to provide an intelligent, conversational chatbot that collects user medical information naturally through dialogue.

## Features

The Gemini-powered chatbot:
- Asks ONE question at a time to avoid overwhelming patients
- Collects medical information conversationally:
  - Cancer type
  - Disease stage
  - Age
  - Location (city and province)
  - Biomarkers (optional)
  - Diagnosis date (optional)
- Shows empathy and provides supportive responses
- Automatically searches for matching trials once enough information is collected
- Updates the user profile dynamically as information is gathered

## Setup Instructions

### 1. Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your API key:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

## How It Works

### Conversational Flow

The chatbot follows the mentor's guidance from the email:

1. **Initial Greeting**: "What type of cancer have you been diagnosed with?"
2. **Follow-up Questions**: Based on user responses, asks about:
   - Disease stage
   - Age
   - Location
   - Other relevant medical information
3. **Acknowledgment**: After each response, the bot acknowledges warmly
4. **Search Trigger**: Once enough information is collected, automatically searches for matching trials

### Example Conversation

```
Bot: Hello! I'm here to help you find clinical trials. What type of cancer have you been diagnosed with?

User: I have lung cancer. They tell me it is advanced.

Bot: I understand this is a difficult time. Thank you for sharing that. Can you tell me what stage your lung cancer is? For example, Stage I, II, III, or IV?

User: It was back in July.

Bot: Of this year?

User: Yes.

Bot: Do you know what type of lung cancer you have? Typical types are "squamous" and "adenocarcinoma."

User: I don't know. How would I find out?

Bot: Do you have a copy of a pathologist's report? If you do, you can upload it here and I will try to figure it out...
```

## Architecture

### Key Files

- **`src/lib/geminiService.ts`**: Core Gemini API integration
  - `GeminiChatService` class manages conversation state
  - Extracts medical information from natural language
  - Determines when to trigger trial search

- **`src/components/ChatPanel.tsx`**: Updated chat interface
  - Uses Gemini for initial information gathering
  - Falls back to rule-based system after search
  - Handles both conversational and command-based interactions

- **`src/contexts/AssistantContext.tsx`**: State management
  - Manages messages and user profile
  - Updates profile dynamically as information is collected

### Conversation State

The service tracks:
```typescript
{
  cancer_type?: string;
  disease_stage?: string;
  age?: number;
  city?: string;
  province?: string;
  biomarkers?: string[];
  diagnosis_date?: string;
  isComplete: boolean;
}
```

## API Usage

### Model Configuration

- **Model**: `gemini-1.5-flash`
- **System Instruction**: Detailed prompt for empathetic, step-by-step information gathering
- **Chat History**: Maintains conversation context

### Error Handling

If the Gemini API fails:
- Falls back to rule-based system
- Logs error to console
- Shows user-friendly error message

## Customization

### Modify System Prompt

Edit `SYSTEM_PROMPT` in `src/lib/geminiService.ts` to change:
- Conversation style
- Information collection order
- Response tone

### Add New Information Fields

1. Update `ConversationState` interface
2. Add extraction logic in `updateConversationState()`
3. Include in `buildUserProfile()` method

### Change Search Trigger Logic

Modify `shouldTriggerSearch()` method to customize when trials are searched.

## Best Practices

1. **API Key Security**: Never commit `.env` file to version control
2. **Rate Limiting**: Gemini API has usage limits - monitor your usage
3. **Error Handling**: Always have fallback logic for API failures
4. **User Privacy**: Medical information is sensitive - handle with care

## Troubleshooting

### "API Key not found" error
- Ensure `.env` file exists in project root
- Verify `VITE_GEMINI_API_KEY` is set correctly
- Restart dev server after adding environment variables

### Chatbot not responding
- Check browser console for errors
- Verify API key is valid
- Check network connectivity
- Ensure Gemini API quota is not exceeded

### Information not being extracted
- Check `updateConversationState()` logic
- Add console logs to debug extraction
- Verify user input format matches regex patterns

## Resources

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Pricing](https://ai.google.dev/pricing)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Gemini API documentation
3. Check browser console for detailed error messages
