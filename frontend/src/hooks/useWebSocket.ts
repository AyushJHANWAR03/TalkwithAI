'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Prompt, TranscriptSegment, WebSocketMessage, SessionInfo } from '@/types';

interface UseWebSocketProps {
  url: string;
  onPrompt?: (prompt: Prompt) => void;
  onTranscript?: (segment: TranscriptSegment) => void;
  onSessionInfo?: (info: SessionInfo) => void;
  onError?: (error: string) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendAudio: (data: Blob) => void;
  sessionInfo: SessionInfo | null;
}

export function useWebSocket({
  url,
  onPrompt,
  onTranscript,
  onSessionInfo,
  onError,
}: UseWebSocketProps): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const isConnectedRef = useRef(false);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('WebSocket message received:', message.type, message.data);

      switch (message.type) {
        case 'prompt':
          if (onPrompt) {
            onPrompt(message.data as Prompt);
          }
          break;
        case 'transcript':
          if (onTranscript) {
            onTranscript(message.data as TranscriptSegment);
          }
          break;
        case 'session_info':
          const info = message.data as SessionInfo;
          setSessionInfo(info);
          if (onSessionInfo) {
            onSessionInfo(info);
          }
          break;
        case 'error':
          console.error('Server error:', message.data);
          if (onError) {
            onError(message.data as string);
          }
          break;
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  }, [onPrompt, onTranscript, onSessionInfo, onError]);

  const connect = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        console.log('Connecting to WebSocket:', url);
        wsRef.current = new WebSocket(url);

        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          isConnectedRef.current = true;
          resolve();
        };

        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          isConnectedRef.current = false;
        };

        wsRef.current.onerror = (err) => {
          console.error('WebSocket error:', err);
          if (onError) {
            onError('Connection error');
          }
          reject(err);
        };

        wsRef.current.onmessage = handleMessage;
      } catch (err) {
        console.error('Failed to connect WebSocket:', err);
        if (onError) {
          onError('Failed to connect');
        }
        reject(err);
      }
    });
  }, [url, handleMessage, onError]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    isConnectedRef.current = false;
  }, []);

  const sendAudio = useCallback((data: Blob) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      data.arrayBuffer().then((buffer) => {
        wsRef.current?.send(buffer);
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    sendAudio,
    sessionInfo,
  };
}
