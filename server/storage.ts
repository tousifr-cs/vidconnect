import { type Room, type InsertRoom, type Participant, type InsertParticipant } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Room methods
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined>;
  
  // Participant methods
  getParticipantsByRoom(roomId: string): Promise<Participant[]>;
  getParticipant(id: string): Promise<Participant | undefined>;
  getParticipantByPeerId(peerId: string): Promise<Participant | undefined>;
  createParticipant(participant: InsertParticipant): Promise<Participant>;
  updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant | undefined>;
  removeParticipant(id: string): Promise<void>;
  removeParticipantByPeerId(peerId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private rooms: Map<string, Room>;
  private participants: Map<string, Participant>;

  constructor() {
    this.rooms = new Map();
    this.participants = new Map();
  }

  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const room: Room = {
      ...insertRoom,
      createdAt: new Date(),
      isActive: true,
    };
    this.rooms.set(room.id, room);
    return room;
  }

  async updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, ...updates };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async getParticipantsByRoom(roomId: string): Promise<Participant[]> {
    return Array.from(this.participants.values()).filter(
      (participant) => participant.roomId === roomId
    );
  }

  async getParticipant(id: string): Promise<Participant | undefined> {
    return this.participants.get(id);
  }

  async getParticipantByPeerId(peerId: string): Promise<Participant | undefined> {
    return Array.from(this.participants.values()).find(
      (participant) => participant.peerId === peerId
    );
  }

  async createParticipant(insertParticipant: InsertParticipant): Promise<Participant> {
    const id = randomUUID();
    const participant: Participant = {
      ...insertParticipant,
      id,
      joinedAt: new Date(),
      audioEnabled: insertParticipant.audioEnabled ?? true,
      videoEnabled: insertParticipant.videoEnabled ?? true,
      isHost: insertParticipant.isHost ?? false,
    };
    this.participants.set(id, participant);
    return participant;
  }

  async updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant | undefined> {
    const participant = this.participants.get(id);
    if (!participant) return undefined;
    
    const updatedParticipant = { ...participant, ...updates };
    this.participants.set(id, updatedParticipant);
    return updatedParticipant;
  }

  async removeParticipant(id: string): Promise<void> {
    this.participants.delete(id);
  }

  async removeParticipantByPeerId(peerId: string): Promise<void> {
    const participantEntries = Array.from(this.participants.entries());
    for (const [id, participant] of participantEntries) {
      if (participant.peerId === peerId) {
        this.participants.delete(id);
        break;
      }
    }
  }
}

export const storage = new MemStorage();
