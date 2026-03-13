# Cancer Trials Canada

A web application to help patients find and match with clinical trials for cancer treatment across Canada.

## Features

- **Conversational AI Assistant** powered by Gemini 1.5 Flash - collects patient information naturally through dialogue
- **AI-powered trial matching** based on patient profile
- **Interactive map** showing trial locations with routes
- **Smart search** with distance and suitability scoring
- **Real-time trial information** and eligibility criteria
- **Empathetic conversation flow** - asks one question at a time

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Google Gemini API key - [get one here](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone and install dependencies:**
   ```sh
   npm install
   ```

2. **Set up Gemini API:**
   ```sh
   cp .env.example .env
   ```
   
   Edit `.env` and add your Gemini API key:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

3. **Start development server:**
   ```sh
   npm run dev
   ```

4. **Open in browser:**
   Open [http://localhost:5173](http://localhost:5173) in your browser.

> **📖 Detailed Setup Guide:** See [GEMINI_SETUP.md](./GEMINI_SETUP.md) for complete Gemini integration documentation.

### Build

```sh
npm run build
```

### Preview Production Build

```sh
npm run preview
```

## How It Works

### Conversational Information Gathering

The chatbot uses Gemini 2.5 Flash to collect patient information naturally:

1. **Asks one question at a time** - avoids overwhelming patients
2. **Shows empathy** - acknowledges responses warmly
3. **Extracts information** - understands natural language responses
4. **Updates profile dynamically** - builds patient profile as conversation progresses
5. **Triggers search automatically** - finds matching trials when enough info is collected

### Example Conversation

```
Bot: Hello! What type of cancer have you been diagnosed with?
User: I have lung cancer. They tell me it is advanced.
Bot: I understand this is a difficult time. Can you tell me what stage?
User: It was back in July.
Bot: Of this year?
User: Yes.
Bot: Do you know what type of lung cancer you have?
```

## Technology Stack

- **React + TypeScript** - UI framework
- **Vite** - Build tool
- **Gemini 1.5 Flash** - Conversational AI
- **Tailwind CSS** - Styling
- **Leaflet** - Interactive maps
- **Radix UI** - Accessible components
- **OSRM** - Route calculation

## License

All rights reserved.
