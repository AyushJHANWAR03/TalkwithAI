# PromptCast - AI Live Video Prompt Assistant

## Project Overview

A browser-based recording tool that listens to your voice in real-time and shows context-aware prompts to help creators speak better on camera.

**One-liner**: Record a video or podcast while AI gives you real-time prompts so you never get stuck.

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Real-time**: WebSocket client, WebRTC (MediaRecorder API)
- **Location**: `/frontend`

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Real-time**: WebSocket server
- **AI Services**:
  - Speech-to-Text: Deepgram (streaming)
  - LLM: OpenAI GPT-4
- **Location**: `/backend`

### Deployment
- **Target**: Digital Ocean Droplet (2GB RAM)
- **Containerization**: Docker + Docker Compose
- **SSL**: Let's Encrypt (Certbot)

## Project Structure

```
/PromptAI
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilities
│   │   └── types/           # TypeScript types
│   ├── public/
│   └── package.json
│
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── main.py          # FastAPI entry point
│   │   ├── websocket/       # WebSocket handlers
│   │   ├── services/        # AI services (Deepgram, OpenAI)
│   │   └── config.py        # Configuration
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml        # Production deployment
├── docker-compose.dev.yml    # Local development
└── CLAUDE.md
```

## Key Features (MVP)

1. **Live Recording** - Webcam + mic via browser (max 15 minutes)
2. **Real-Time Speech-to-Text** - Streaming transcription via Deepgram
3. **AI Prompts** - Context-aware suggestions every 10-20 seconds
4. **Export** - Download recorded video as MP4

## Architecture Flow

```
Browser (Audio Stream)
    ↓ WebSocket
FastAPI Server
    ↓ Stream audio chunks
Deepgram (STT)
    ↓ Partial transcripts
Context Window (last 30-60s)
    ↓ Every 10-15s
OpenAI GPT-4 (Prompt Generation)
    ↓ WebSocket
Browser (Display Prompt Overlay)
```

## Environment Variables

### Backend (`/backend/.env`)
```
DEEPGRAM_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

### Frontend (`/frontend/.env.local`)
```
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

## Commands

### Development
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Production (Docker)
```bash
docker-compose up -d --build
```

## MVP Constraints

- No user accounts / authentication
- No cloud video storage (video stays in browser)
- No editing tools
- English only
- 15-minute session limit (enforced client + server side)
- Max 1 prompt per 10-15 seconds

## AI Prompt Strategy

The LLM receives:
- Last 30-60 seconds of transcript (sliding window)
- Current conversation state

It generates:
- Follow-up questions
- Topic expansion prompts
- Transition prompts
- Closing suggestions

**Prompt throttling**: Max 1 prompt every 10-15 seconds to avoid overwhelming the speaker.

## Non-Goals (Phase 1)

- User accounts
- Cloud video storage
- Video editing
- Multi-language support
- Analytics dashboard
