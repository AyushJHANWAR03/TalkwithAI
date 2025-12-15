# TalkWithAI - Your AI Friend for Video Recording

An AI-powered video recording assistant that acts like a supportive friend during your recordings. Instead of just transcribing, it actively participates in your conversation with questions, reactions, and encouragements.

## Why I Built This

I was frustrated with traditional video recording apps that just... record. When you're creating content alone, it's hard to stay engaging. You talk to a camera, but there's no feedback, no conversation, no one to bounce ideas off.

**TalkWithAI solves this** by giving you an AI friend who:
- Listens to everything you say (real-time transcription)
- Asks interesting follow-up questions
- Reacts naturally ("Wow, that's intense!", "No way!")
- Encourages you to keep going ("That's really cool!")
- Remembers the full conversation context

It's like having a podcast co-host who never interrupts at the wrong time.

## Features

- **Real-time Speech-to-Text** - Powered by Deepgram Nova-2 with Indian English support
- **AI Friend Responses** - GPT-4o-mini generates contextual questions, reactions, and encouragements
- **Smart Pause Detection** - Only responds when you've actually finished speaking (3+ seconds of silence)
- **Full Conversation Memory** - AI remembers everything discussed and makes connections
- **Live Video Preview** - See yourself while recording with mirrored view
- **15-Minute Sessions** - Perfect for focused content creation

## Tech Stack

### Frontend
- Next.js 14 with TypeScript
- Tailwind CSS for styling
- WebSocket for real-time communication
- MediaRecorder API for video capture

### Backend
- FastAPI (Python)
- Deepgram for speech-to-text
- OpenAI GPT-4o-mini for AI responses
- WebSocket for bidirectional streaming

## Architecture

```
┌─────────────────┐     Audio Stream      ┌─────────────────┐
│                 │ ──────────────────>   │                 │
│    Frontend     │                       │    Backend      │
│   (Next.js)     │ <──────────────────   │   (FastAPI)     │
│                 │   Transcripts +       │                 │
└─────────────────┘   AI Responses        └─────────────────┘
                                                   │
                                                   ▼
                            ┌──────────────────────────────────┐
                            │  Deepgram       │    OpenAI      │
                            │  (Speech→Text)  │  (AI Friend)   │
                            └──────────────────────────────────┘
```

## Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- Deepgram API key
- OpenAI API key

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo "DEEPGRAM_API_KEY=your_key_here" > .env
echo "OPENAI_API_KEY=your_key_here" >> .env

# Run server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install

# Create .env.local file
echo "NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws" > .env.local

# Run dev server
npm run dev
```

Open http://localhost:3000 and start recording!

## How It Works

1. **Start Recording** - Click the button, grant camera/mic permissions
2. **Speak Naturally** - Talk about anything you want
3. **AI Responds** - After you pause (3+ seconds), the AI friend responds with:
   - A question to dig deeper
   - A reaction to what you said
   - Encouragement to continue
4. **Keep Talking** - The AI remembers everything and builds on the conversation
5. **Stop & Export** - Download your video when done

## Configuration

Key settings in `backend/app/config.py`:
- `max_session_duration`: Session length (default: 900 seconds / 15 min)
- `context_window_duration`: How much recent transcript to focus on (default: 60 seconds)

Pause detection in `backend/app/websocket/session.py`:
- `is_micro_pause()`: Currently set to 3 seconds of silence

## License

MIT
