import asyncio
import json
import uuid
import traceback
import sys
from fastapi import WebSocket, WebSocketDisconnect
from app.config import get_settings
from app.services.deepgram_service import DeepgramService
from app.services.prompt_generator import PromptGenerator
from app.websocket.session import Session, SessionManager

settings = get_settings()
session_manager = SessionManager()
prompt_generator = PromptGenerator()


def log(msg):
    print(msg, flush=True)
    sys.stdout.flush()


class WebSocketHandler:
    """Handles WebSocket connections for recording sessions."""

    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.session: Session | None = None
        self.deepgram: DeepgramService | None = None
        self._prompt_task: asyncio.Task | None = None
        self._display_task: asyncio.Task | None = None
        self._running = False

    async def handle(self):
        """Main handler for WebSocket connection."""
        await self.websocket.accept()
        log(">>> WebSocket accepted")

        try:
            # Create session
            self.session = session_manager.create_session(
                max_duration=settings.max_session_duration
            )
            log(f">>> Session created: {self.session.session_id}")

            # Send session info
            await self._send_message("session_info", {
                "sessionId": self.session.session_id,
                "maxDuration": self.session.max_duration,
                "timeRemaining": self.session.time_remaining,
            })

            # Initialize Deepgram
            self.deepgram = DeepgramService(
                on_transcript=lambda text, is_final: asyncio.create_task(
                    self._handle_transcript(text, is_final)
                ),
                on_error=lambda err: asyncio.create_task(
                    self._send_message("error", err)
                ),
            )

            log(">>> Connecting to Deepgram...")
            await self.deepgram.connect()
            log(">>> Connected to Deepgram!")
            self._running = True

            # Send welcome message to let user know AI is ready
            await self._send_message("prompt", {
                "id": str(uuid.uuid4()),
                "text": "Hi! Start speaking and I'll ask you interesting questions along the way.",
                "type": "welcome",
                "timestamp": 0,
            })
            log(">>> Sent welcome message")

            # Start TWO background tasks:
            # 1. Prompt preparation (generates prompts proactively)
            # 2. Prompt display (shows prompts at right moment)
            self._prompt_task = asyncio.create_task(self._prompt_preparation_loop())
            self._display_task = asyncio.create_task(self._prompt_display_loop())

            # Receive audio data
            log(">>> Waiting for audio data...")
            audio_count = 0
            while self._running:
                try:
                    data = await asyncio.wait_for(
                        self.websocket.receive_bytes(),
                        timeout=1.0
                    )

                    audio_count += 1
                    if audio_count % 20 == 1:
                        log(f">>> Audio chunk #{audio_count}: {len(data)} bytes")

                    if self.session.is_expired:
                        await self._send_message("error", "Session expired")
                        break

                    await self.deepgram.send_audio(data)

                except asyncio.TimeoutError:
                    if self.session.is_expired:
                        await self._send_message("error", "Session expired")
                        break
                    continue

        except WebSocketDisconnect:
            log(f">>> Client disconnected")
        except Exception as e:
            log(f">>> WebSocket error: {e}")
            traceback.print_exc()
            try:
                await self._send_message("error", str(e))
            except:
                pass
        finally:
            await self._cleanup()

    async def _handle_transcript(self, text: str, is_final: bool):
        """Handle incoming transcript from Deepgram."""
        if not self.session:
            return

        # Add to session (this updates timing tracking)
        self.session.add_transcript(text, is_final)

        # Send to client immediately - don't wait
        await self._send_message("transcript", {
            "text": text,
            "timestamp": self.session.duration,
            "isFinal": is_final,
        })

    async def _prompt_preparation_loop(self):
        """
        Background task to PREPARE prompts proactively.
        Generates the next prompt before it's needed so there's no delay.
        """
        log(">>> [PREP] Prompt preparation loop started")

        while self._running and self.session and not self.session.is_expired:
            try:
                await asyncio.sleep(1)  # Check frequently

                # Should we prepare a new prompt?
                if not self.session.should_prepare_prompt():
                    continue

                # Already have one ready?
                if self.session.pending_prompt:
                    log(f">>> [PREP] Already have pending prompt, waiting...")
                    continue

                # Get recent transcript (for focus)
                transcript = self.session.get_recent_transcript(
                    settings.context_window_duration
                )

                if len(transcript.strip()) < 15:
                    log(f">>> [PREP] Transcript too short ({len(transcript.strip())} chars)")
                    continue

                # Get full transcript (for context awareness)
                full_transcript = self.session.get_full_transcript()

                log(f">>> [PREP] Generating prompt (full context: {len(full_transcript)} chars)")

                # Generate prompt in background with full context
                is_closing = self.session.time_remaining < 60
                result = await prompt_generator.generate_prompt(
                    transcript=transcript,
                    duration_seconds=self.session.duration,
                    is_closing=is_closing,
                    full_transcript=full_transcript,
                )

                if result:
                    # Store it, ready to display at the right moment
                    self.session.set_pending_prompt({
                        "id": str(uuid.uuid4()),
                        "text": result["text"],
                        "type": result["type"],
                        "timestamp": self.session.duration,
                    })
                    log(f">>> [PREP] Prompt ready: '{result['text'][:50]}...'")
                else:
                    log(f">>> [PREP] No prompt generated")

            except asyncio.CancelledError:
                break
            except Exception as e:
                log(f">>> [PREP] Error: {e}")

    async def _prompt_display_loop(self):
        """
        Background task to DISPLAY prepared prompts at natural moments.
        Checks very frequently for micro-pauses (breath points).
        """
        log(">>> [DISPLAY] Prompt display loop started")
        check_count = 0

        while self._running and self.session and not self.session.is_expired:
            try:
                await asyncio.sleep(0.2)  # Check 5 times per second for responsiveness
                check_count += 1

                # Log status every 50 checks (10 seconds)
                if check_count % 50 == 0:
                    has_pending = bool(self.session.pending_prompt)
                    is_pause = self.session.is_micro_pause()
                    can_show = self.session.can_show_prompt()
                    log(f">>> [DISPLAY] Status: pending={has_pending}, pause={is_pause}, can_show={can_show}")

                # Can we show a prompt now?
                if not self.session.can_show_prompt():
                    continue

                # Get and send the pending prompt
                prompt = self.session.get_and_clear_pending_prompt()
                if prompt:
                    log(f">>> [DISPLAY] Showing prompt: '{prompt['text'][:40]}...'")
                    self.session.record_prompt()
                    await self._send_message("prompt", prompt)

            except asyncio.CancelledError:
                break
            except Exception as e:
                log(f">>> [DISPLAY] Error: {e}")

    async def _send_message(self, msg_type: str, data):
        """Send a message to the client."""
        try:
            message = json.dumps({
                "type": msg_type,
                "data": data,
            })
            await self.websocket.send_text(message)
        except Exception as e:
            log(f">>> Failed to send message: {e}")

    async def _cleanup(self):
        """Clean up resources."""
        log(">>> Cleaning up...")
        self._running = False

        for task in [self._prompt_task, self._display_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        if self.deepgram:
            await self.deepgram.close()

        if self.session:
            session_manager.remove_session(self.session.session_id)
        log(">>> Cleanup complete")
