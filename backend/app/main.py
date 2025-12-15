from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.websocket.handler import WebSocketHandler

settings = get_settings()

app = FastAPI(
    title="PromptCast API",
    description="AI-powered real-time video prompt assistant",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "PromptCast API",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    """Health check endpoint for Docker/load balancer."""
    return {"status": "healthy"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for recording sessions."""
    handler = WebSocketHandler(websocket)
    await handler.handle()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
