import { useState, useEffect, useRef } from "react";
import type { WSMessage, Participant } from "@shared/schema";

interface ChatMessage {
  id: string;
  peerId: string;
  username: string;
  message: string;
  timestamp: number;
  isOwn: boolean;
}

export function useWebSocket(roomId: string, username: string, onWebRTCMessage?: (message: any) => void) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const peerIdRef = useRef<string>(`peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const webrtcCallbackRef = useRef(onWebRTCMessage);

  // Keep callback reference up to date
  useEffect(() => {
    webrtcCallbackRef.current = onWebRTCMessage;
  }, [onWebRTCMessage]);

  useEffect(() => {
    if (!roomId || !username) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected to:', wsUrl);
      setIsConnected(true);
      // Join the room
      const joinMessage = {
        type: 'join-room' as const,
        roomId,
        username,
        peerId: peerIdRef.current,
      };
      ws.send(JSON.stringify(joinMessage));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error, "URL:", wsUrl);
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        const leaveMessage = {
          type: 'leave-room' as const,
          roomId,
          peerId: peerIdRef.current,
        };
        ws.send(JSON.stringify(leaveMessage));
      }
      ws.close();
    };
  }, [roomId, username]);

  const sendMessage = (message: WSMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const handleMessage = (data: any) => {
    switch (data.type) {
      case 'room-joined':
        const existingParticipants = data.participants || [];
        setParticipants(existingParticipants);
        
        // Initiate connections to all existing participants (excluding self)
        const myPeerId = peerIdRef.current;
        if (webrtcCallbackRef.current) {
          existingParticipants
            .filter((p: Participant) => p.peerId !== myPeerId)
            .forEach((participant: Participant) => {
              webrtcCallbackRef.current!({ type: 'peer-joined', peerId: participant.peerId });
            });
        }
        break;
        
      case 'participant-joined':
        setParticipants(prev => [...prev, data.participant]);
        // Only new joiners initiate connections to avoid offer glare
        // Existing participants don't initiate - the new joiner handles all connections
        break;
        
      case 'participant-left':
        setParticipants(prev => prev.filter(p => p.peerId !== data.peerId));
        // Handle peer disconnection
        if (webrtcCallbackRef.current) {
          webrtcCallbackRef.current({ type: 'peer-left', peerId: data.peerId });
        }
        break;
        
      case 'participant-updated':
        setParticipants(prev => 
          prev.map(p => 
            p.peerId === data.peerId 
              ? { 
                  ...p, 
                  audioEnabled: data.audioEnabled ?? p.audioEnabled,
                  videoEnabled: data.videoEnabled ?? p.videoEnabled 
                }
              : p
          )
        );
        break;
        
      case 'webrtc-offer':
      case 'webrtc-answer':
      case 'webrtc-ice-candidate':
        // Forward WebRTC signaling messages
        if (webrtcCallbackRef.current) {
          webrtcCallbackRef.current(data);
        }
        break;
        
      case 'chat-message-received':
        // Handle incoming chat messages
        const newChatMessage: ChatMessage = {
          id: data.id,
          peerId: data.peerId,
          username: data.username,
          message: data.message,
          timestamp: data.timestamp,
          isOwn: data.peerId === peerIdRef.current,
        };
        setChatMessages(prev => [...prev, newChatMessage]);
        break;
        
      case 'error':
        console.error("Server error:", data.message);
        break;
        
      default:
        console.log("Unhandled message type:", data.type);
    }
  };

  return {
    participants,
    chatMessages,
    isConnected,
    sendMessage,
    peerId: peerIdRef.current,
  };
}
