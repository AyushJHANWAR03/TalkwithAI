import time
import uuid
from typing import Optional, List
from dataclasses import dataclass, field
from collections import deque


@dataclass
class TranscriptSegment:
    text: str
    timestamp: float
    is_final: bool


@dataclass
class Session:
    """Represents a recording session."""

    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    start_time: float = field(default_factory=time.time)
    max_duration: int = 900  # 15 minutes
    transcript_segments: List[TranscriptSegment] = field(default_factory=list)
    last_prompt_time: float = 0
    prompt_count: int = 0
    is_paused: bool = False

    # Real-time tracking
    last_audio_time: float = 0  # When we last received audio with speech
    current_utterance: str = ""  # Building current sentence
    word_timestamps: deque = field(default_factory=lambda: deque(maxlen=50))  # Recent word timings
    pending_prompt: dict = field(default_factory=dict)  # Pre-generated prompt ready to show

    @property
    def duration(self) -> int:
        return int(time.time() - self.start_time)

    @property
    def time_remaining(self) -> int:
        return max(0, self.max_duration - self.duration)

    @property
    def is_expired(self) -> bool:
        return self.duration >= self.max_duration

    def set_paused(self, paused: bool):
        self.is_paused = paused

    def add_transcript(self, text: str, is_final: bool):
        """Add a transcript segment - track timing for rhythm detection."""
        now = time.time()

        segment = TranscriptSegment(
            text=text,
            timestamp=now,
            is_final=is_final,
        )

        # Only update last_audio_time on FINAL transcripts
        # This prevents interim (partial) transcripts from resetting the pause timer
        # Interim transcripts come constantly while speaking, final ones come at sentence boundaries
        if is_final:
            self.last_audio_time = now
            self.word_timestamps.append(now)
            self.current_utterance = ""
            self.transcript_segments.append(segment)
        else:
            # Still update if it's significantly new content (not just small updates)
            if len(text) > len(self.current_utterance) + 5:
                self.last_audio_time = now
            self.current_utterance = text
            # Update interim in place
            if self.transcript_segments and not self.transcript_segments[-1].is_final:
                self.transcript_segments[-1] = segment
            else:
                self.transcript_segments.append(segment)

    def get_recent_transcript(self, seconds: int = 60) -> str:
        """Get transcript including current interim for faster context."""
        cutoff_time = time.time() - seconds
        recent = [
            seg.text for seg in self.transcript_segments
            if seg.timestamp >= cutoff_time
        ]
        return " ".join(recent)

    def get_full_transcript(self) -> str:
        """Get the complete transcript from the entire session."""
        # Only include final segments to avoid duplicates from interim updates
        final_segments = [
            seg.text for seg in self.transcript_segments
            if seg.is_final
        ]
        return " ".join(final_segments)

    def get_speech_rate(self) -> float:
        """Calculate recent speech rate (words per second) to detect pauses."""
        if len(self.word_timestamps) < 2:
            return 0

        # Look at last 3 seconds of word timestamps
        now = time.time()
        recent = [t for t in self.word_timestamps if now - t < 3.0]

        if len(recent) < 2:
            return 0

        time_span = recent[-1] - recent[0]
        if time_span <= 0:
            return 0

        return len(recent) / time_span

    def is_micro_pause(self) -> bool:
        """
        Detect a real pause - when user has finished their thought.
        Must be a genuine conversational pause, not just a breath.
        """
        if self.last_audio_time == 0:
            return False

        time_since_speech = time.time() - self.last_audio_time

        # Real pause: 3+ seconds of no new transcript
        # 1.5 sec = breath between sentences (still thinking)
        # 3.0 sec = likely finished their thought, good time to ask
        return time_since_speech >= 3.0

    def should_prepare_prompt(self) -> bool:
        """
        Should we start generating a prompt in background?
        Generate proactively so it's ready when needed.
        """
        if self.is_paused:
            return False

        # Start preparing after 8 seconds, then every 12 seconds
        if self.last_prompt_time == 0:
            return self.duration >= 8

        return (time.time() - self.last_prompt_time) >= 12

    def can_show_prompt(self) -> bool:
        """
        Can we show a prepared prompt now?
        Show at micro-pauses, not full sentence ends.
        """
        if self.is_paused:
            return False

        if not self.pending_prompt:
            return False

        # Must have minimum interval
        if self.last_prompt_time == 0:
            if self.duration < 10:
                return False
        else:
            if (time.time() - self.last_prompt_time) < 12:
                return False

        # Show at micro-pause (natural breath point)
        return self.is_micro_pause()

    def set_pending_prompt(self, prompt: dict):
        """Store a pre-generated prompt."""
        self.pending_prompt = prompt

    def get_and_clear_pending_prompt(self) -> Optional[dict]:
        """Get the pending prompt and clear it."""
        prompt = self.pending_prompt
        self.pending_prompt = {}
        return prompt if prompt else None

    def record_prompt(self):
        self.last_prompt_time = time.time()
        self.prompt_count += 1


class SessionManager:
    """Manages active sessions."""

    def __init__(self):
        self._sessions: dict[str, Session] = {}

    def create_session(self, max_duration: int = 900) -> Session:
        session = Session(max_duration=max_duration)
        self._sessions[session.session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        return self._sessions.get(session_id)

    def remove_session(self, session_id: str):
        if session_id in self._sessions:
            del self._sessions[session_id]

    def cleanup_expired(self):
        expired = [
            sid for sid, session in self._sessions.items()
            if session.is_expired
        ]
        for sid in expired:
            del self._sessions[sid]
