import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { wsMessageSchema, insertRoomSchema } from "@shared/schema";
import { randomUUID } from "crypto";

interface WebSocketClient extends WebSocket {
  peerId?: string;
  roomId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for signaling
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Map<string, WebSocketClient>();

  // REST API Routes
  
  // Create a new room
  app.post("/api/rooms", async (req, res) => {
    try {
      const roomData = insertRoomSchema.parse({
        id: generateRoomId(),
        hostId: randomUUID(),
      });
      
      const room = await storage.createRoom(roomData);
      res.json(room);
    } catch (error) {
      res.status(400).json({ message: "Failed to create room" });
    }
  });

  // Get room details
  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      const participants = await storage.getParticipantsByRoom(room.id);
      res.json({ ...room, participants });
    } catch (error) {
      res.status(500).json({ message: "Failed to get room" });
    }
  });

  // WebSocket handling for signaling
  wss.on('connection', (ws: WebSocketClient) => {
    ws.on('message', async (data) => {
      try {
        const message = wsMessageSchema.parse(JSON.parse(data.toString()));
        
        switch (message.type) {
          case 'join-room':
            await handleJoinRoom(ws, message, clients);
            break;
            
          case 'leave-room':
            await handleLeaveRoom(ws, message, clients);
            break;
            
          case 'webrtc-offer':
          case 'webrtc-answer':
          case 'webrtc-ice-candidate':
            await handleWebRTCSignaling(ws, message, clients);
            break;
            
          case 'participant-update':
            await handleParticipantUpdate(message, clients);
            break;

          case 'chat-message':
            await handleChatMessage(ws, message, clients);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      if (ws.peerId) {
        await handleDisconnect(ws, clients);
      }
    });
  });

  async function handleJoinRoom(
    ws: WebSocketClient, 
    message: Extract<typeof wsMessageSchema._type, { type: 'join-room' }>,
    clients: Map<string, WebSocketClient>
  ) {
    const { roomId, username, peerId } = message;
    
    // Check if room exists
    const room = await storage.getRoom(roomId);
    if (!room || !room.isActive) {
      ws.send(JSON.stringify({ type: 'error', message: 'Room not found or inactive' }));
      return;
    }

    // Create participant
    const participants = await storage.getParticipantsByRoom(roomId);
    const isHost = participants.length === 0;
    
    const participant = await storage.createParticipant({
      roomId,
      username,
      peerId,
      isHost,
      audioEnabled: true,
      videoEnabled: true,
    });

    // Store client connection
    ws.peerId = peerId;
    ws.roomId = roomId;
    clients.set(peerId, ws);

    // Notify existing participants
    const roomClients = Array.from(clients.values()).filter(
      client => client.roomId === roomId && client.peerId !== peerId
    );

    roomClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'participant-joined',
          participant,
        }));
      }
    });

    // Send current participants to new client
    const allParticipants = await storage.getParticipantsByRoom(roomId);
    ws.send(JSON.stringify({
      type: 'room-joined',
      participants: allParticipants,
    }));
  }

  async function handleLeaveRoom(
    ws: WebSocketClient,
    message: Extract<typeof wsMessageSchema._type, { type: 'leave-room' }>,
    clients: Map<string, WebSocketClient>
  ) {
    const { roomId, peerId } = message;
    
    await storage.removeParticipantByPeerId(peerId);
    clients.delete(peerId);
    
    // Notify other participants
    const roomClients = Array.from(clients.values()).filter(
      client => client.roomId === roomId
    );

    roomClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'participant-left',
          peerId,
        }));
      }
    });
  }

  async function handleWebRTCSignaling(
    ws: WebSocketClient,
    message: Extract<typeof wsMessageSchema._type, { type: 'webrtc-offer' | 'webrtc-answer' | 'webrtc-ice-candidate' }>,
    clients: Map<string, WebSocketClient>
  ) {
    // Enforce sender identity from WebSocket connection, not client message
    const senderPeerId = ws.peerId;
    const senderRoomId = ws.roomId;
    const { targetPeerId } = message;
    
    if (!senderPeerId || !senderRoomId) {
      return; // Invalid sender connection
    }
    
    const targetClient = clients.get(targetPeerId);
    
    // Validate target is in the same room as sender
    if (targetClient && 
        targetClient.roomId === senderRoomId &&
        targetClient.readyState === WebSocket.OPEN) {
      
      // Forward message with server-enforced sender identity
      const forwardedMessage = {
        ...message,
        peerId: senderPeerId,
        roomId: senderRoomId,
      };
      
      targetClient.send(JSON.stringify(forwardedMessage));
    }
  }

  async function handleParticipantUpdate(
    message: Extract<typeof wsMessageSchema._type, { type: 'participant-update' }>,
    clients: Map<string, WebSocketClient>
  ) {
    const { roomId, peerId, audioEnabled, videoEnabled } = message;
    
    const participant = await storage.getParticipantByPeerId(peerId);
    if (participant) {
      const updates: Partial<typeof participant> = {};
      if (audioEnabled !== undefined) updates.audioEnabled = audioEnabled;
      if (videoEnabled !== undefined) updates.videoEnabled = videoEnabled;
      
      await storage.updateParticipant(participant.id, updates);
      
      // Broadcast update to room
      const roomClients = Array.from(clients.values()).filter(
        client => client.roomId === roomId && client.peerId !== peerId
      );

      roomClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'participant-updated',
            peerId,
            audioEnabled,
            videoEnabled,
          }));
        }
      });
    }
  }

  async function handleChatMessage(
    ws: WebSocketClient,
    message: Extract<typeof wsMessageSchema._type, { type: 'chat-message' }>,
    clients: Map<string, WebSocketClient>
  ) {
    // Enforce server-side identity and room validation
    const senderPeerId = ws.peerId;
    const senderRoomId = ws.roomId;
    const { username, message: chatText } = message;
    
    if (!senderPeerId || !senderRoomId) {
      return; // Invalid sender connection
    }

    // Get sender participant for username validation
    const participant = await storage.getParticipantByPeerId(senderPeerId);
    if (!participant || participant.roomId !== senderRoomId) {
      return; // Participant not found or room mismatch
    }
    
    // Generate server-controlled message data
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const serverTimestamp = Date.now();
    
    // Broadcast chat message to all participants in the room
    const roomClients = Array.from(clients.values()).filter(
      client => client.roomId === senderRoomId
    );

    roomClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'chat-message-received',
          peerId: senderPeerId,
          username: participant.username, // Use server-validated username
          message: chatText,
          timestamp: serverTimestamp,
          id: messageId,
        }));
      }
    });
  }

  async function handleDisconnect(
    ws: WebSocketClient,
    clients: Map<string, WebSocketClient>
  ) {
    if (ws.peerId) {
      await storage.removeParticipantByPeerId(ws.peerId);
      clients.delete(ws.peerId);
      
      if (ws.roomId) {
        const roomClients = Array.from(clients.values()).filter(
          client => client.roomId === ws.roomId
        );

        roomClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'participant-left',
              peerId: ws.peerId,
            }));
          }
        });
      }
    }
  }

  function generateRoomId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const segments = [];
    
    for (let i = 0; i < 3; i++) {
      let segment = '';
      for (let j = 0; j < 3; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    
    return segments.join('-');
  }

  return httpServer;
}
