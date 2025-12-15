export interface Prompt {
  id: string;
  text: string;
  type: 'follow_up' | 'expand' | 'transition' | 'closing';
  timestamp: number;
}

export interface TranscriptSegment {
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  timeRemaining: number;
}

export interface WebSocketMessage {
  type: 'transcript' | 'prompt' | 'error' | 'session_info';
  data: unknown;
}

export interface SessionInfo {
  sessionId: string;
  maxDuration: number;
  timeRemaining: number;
}
