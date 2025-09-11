import { useState, useEffect, useRef } from "react";
import type { WSMessage, Participant } from "@shared/schema";

export function useWebSocket(roomId: string, username: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const peerIdRef = useRef<string>(`peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!roomId || !username) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Join the room
      sendMessage({
        type: 'join-room',
        roomId,
        username,
        peerId: peerIdRef.current,
      });
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
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        sendMessage({
          type: 'leave-room',
          roomId,
          peerId: peerIdRef.current,
        });
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
        setParticipants(data.participants || []);
        break;
        
      case 'participant-joined':
        setParticipants(prev => [...prev, data.participant]);
        break;
        
      case 'participant-left':
        setParticipants(prev => prev.filter(p => p.peerId !== data.peerId));
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
        
      case 'error':
        console.error("Server error:", data.message);
        break;
        
      default:
        console.log("Unhandled message type:", data.type);
    }
  };

  return {
    participants,
    isConnected,
    sendMessage,
    peerId: peerIdRef.current,
  };
}
