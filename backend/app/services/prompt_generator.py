import asyncio
from typing import Optional
from openai import AsyncOpenAI
from app.config import get_settings

settings = get_settings()


SYSTEM_PROMPT = """You're a supportive friend having a real conversation. You remember everything discussed.

DON'T ALWAYS ASK QUESTIONS! Mix your responses naturally:

QUESTIONS (most of the time):
- "How did that feel?"
- "What surprised you?"
- "What happened next?"
- "Why that approach?"

REACTIONS (sometimes - when something is exciting/surprising):
- "Wow, that's intense!"
- "No way!"
- "That's a bold move!"
- "Oh interesting!"

ENCOURAGEMENTS (sometimes - to keep them going):
- "That's really cool!"
- "I love that!"
- "Keep going, this is good!"
- "That makes total sense"

RULES:
1. Be natural - react like a real friend would
2. Keep responses SHORT and punchy
3. Reference what they JUST said specifically
4. Use full conversation context to avoid repeating topics
5. Make connections to earlier points when relevant

NEVER:
- Say "You could expand on..." or "Tell us more about..."
- Be generic - always reference their specific words
- Ask the same type of question repeatedly

Return ONLY your response (question, reaction, or encouragement), nothing else."""


class PromptGenerator:
    """Generates contextual prompts using OpenAI's API."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._lock = asyncio.Lock()
        self._previous_questions: list[str] = []  # Track previous questions to avoid repetition

    async def generate_prompt(
        self,
        transcript: str,
        duration_seconds: int,
        is_closing: bool = False,
        full_transcript: str = "",
    ) -> Optional[dict]:
        """
        Generate a contextual prompt based on the transcript.

        Args:
            transcript: The recent transcript text (last 30-60 seconds)
            duration_seconds: How long the user has been speaking
            is_closing: Whether we're near the end of the session
            full_transcript: The complete conversation so far (for context)

        Returns:
            A dict with 'text' and 'type' keys, or None if generation fails
        """
        async with self._lock:
            try:
                # Focus on the LAST part of transcript (most recent speech)
                # Split by sentences and take the last few
                sentences = transcript.replace('?', '?.').replace('!', '!.').replace('.', '.|').split('|')
                sentences = [s.strip() for s in sentences if s.strip()]

                # Take last 3-4 sentences as the focus
                recent_sentences = sentences[-4:] if len(sentences) > 4 else sentences
                recent_transcript = ' '.join(recent_sentences)

                # Build context about previous questions - STRONGLY enforce no repetition
                prev_q_context = ""
                if self._previous_questions:
                    prev_q_context = f"\n\nQUESTIONS ALREADY ASKED (DO NOT ask similar ones - pick a DIFFERENT topic!):\n" + "\n".join(f"- {q}" for q in self._previous_questions[-5:])

                if is_closing:
                    context = "Session ending soon. Ask a good closing/reflective question."
                    prompt_type = "closing"
                elif duration_seconds < 30:
                    context = "Just started. Ask about something interesting they mentioned."
                    prompt_type = "opener"
                else:
                    context = "Mid-conversation. Ask a follow-up about their MOST RECENT point. You can make connections to earlier topics."
                    prompt_type = "follow_up"

                # Build the full context section
                full_context_section = ""
                if full_transcript and len(full_transcript) > len(recent_transcript):
                    full_context_section = f"""FULL CONVERSATION SO FAR (for context - remember everything):
\"\"\"{full_transcript}\"\"\"

"""

                user_message = f"""{full_context_section}WHAT THEY JUST SAID:
\"\"\"{recent_transcript}\"\"\"

{context}{prev_q_context}

IMPORTANT: Ask about something NEW they mentioned. Don't repeat topics from previous questions. Be creative and varied!"""

                response = await self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    max_tokens=80,
                    temperature=0.9,  # Higher temperature for more variety
                )

                prompt_text = response.choices[0].message.content.strip()

                # Clean up the prompt text
                prompt_text = prompt_text.strip('"\'')

                # Store this question to avoid repetition
                self._previous_questions.append(prompt_text)
                if len(self._previous_questions) > 10:
                    self._previous_questions.pop(0)

                return {
                    "text": prompt_text,
                    "type": prompt_type,
                }

            except Exception as e:
                print(f"Failed to generate prompt: {e}")
                return None
