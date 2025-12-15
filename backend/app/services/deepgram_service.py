import asyncio
import json
from typing import Callable, Optional
from websockets.asyncio.client import connect
from websockets.exceptions import ConnectionClosed
from app.config import get_settings

settings = get_settings()


class DeepgramService:
    """Handles real-time speech-to-text using Deepgram's WebSocket API."""

    def __init__(
        self,
        on_transcript: Callable[[str, bool], None],
        on_error: Optional[Callable[[str], None]] = None,
    ):
        self.on_transcript = on_transcript
        self.on_error = on_error
        self.ws = None
        self._running = False

    async def connect(self):
        """Connect to Deepgram's WebSocket API."""
        url = "wss://api.deepgram.com/v1/listen"
        params = (
            "?model=nova-2"  # Best accuracy model
            "&language=en-IN"  # Indian English for better recognition
            "&encoding=linear16"
            "&sample_rate=16000"
            "&channels=1"
            "&punctuate=true"
            "&interim_results=true"
            "&endpointing=300"
            "&smart_format=true"  # Better formatting
            "&filler_words=true"  # Keep "um", "uh" for natural speech
            "&diarize=false"  # Single speaker
        )

        headers = {
            "Authorization": f"Token {settings.deepgram_api_key}",
        }

        try:
            self.ws = await connect(
                url + params,
                additional_headers=headers,
                ping_interval=20,
                ping_timeout=20,
            )
            self._running = True
            asyncio.create_task(self._receive_loop())
            print("Connected to Deepgram")
        except Exception as e:
            print(f"Failed to connect to Deepgram: {e}")
            if self.on_error:
                self.on_error(f"Failed to connect to speech service: {str(e)}")
            raise

    async def _receive_loop(self):
        """Receive and process transcripts from Deepgram."""
        try:
            while self._running and self.ws:
                message = await self.ws.recv()
                data = json.loads(message)

                if data.get("type") == "Results":
                    channel = data.get("channel", {})
                    alternatives = channel.get("alternatives", [])

                    if alternatives:
                        transcript = alternatives[0].get("transcript", "")
                        is_final = data.get("is_final", False)

                        if transcript.strip():
                            print(f"[DG] {'FINAL' if is_final else 'interim'}: '{transcript}'", flush=True)
                            self.on_transcript(transcript, is_final)

        except ConnectionClosed:
            print("Deepgram connection closed")
        except Exception as e:
            print(f"Deepgram receive error: {e}")
            if self.on_error:
                self.on_error(f"Speech recognition error: {str(e)}")
        finally:
            self._running = False

    async def send_audio(self, audio_data: bytes):
        """Send audio data to Deepgram."""
        if self.ws and self._running:
            try:
                await self.ws.send(audio_data)
            except Exception as e:
                print(f"Failed to send audio to Deepgram: {e}")

    async def close(self):
        """Close the Deepgram connection."""
        self._running = False
        if self.ws:
            try:
                # Send close message to Deepgram
                await self.ws.send(json.dumps({"type": "CloseStream"}))
                await self.ws.close()
            except Exception:
                pass
            self.ws = None
