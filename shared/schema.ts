import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey(),
  hostId: varchar("host_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const participants = pgTable("participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => rooms.id).notNull(),
  username: text("username").notNull(),
  peerId: varchar("peer_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  isHost: boolean("is_host").default(false).notNull(),
  audioEnabled: boolean("audio_enabled").default(true).notNull(),
  videoEnabled: boolean("video_enabled").default(true).notNull(),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  createdAt: true,
});

export const insertParticipantSchema = createInsertSchema(participants).omit({
  id: true,
  joinedAt: true,
});

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participants.$inferSelect;

// WebSocket message types
export const wsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join-room"),
    roomId: z.string(),
    username: z.string(),
    peerId: z.string(),
  }),
  z.object({
    type: z.literal("leave-room"),
    roomId: z.string(),
    peerId: z.string(),
  }),
  z.object({
    type: z.literal("webrtc-offer"),
    roomId: z.string(),
    targetPeerId: z.string(),
    offer: z.any(),
  }),
  z.object({
    type: z.literal("webrtc-answer"),
    roomId: z.string(),
    targetPeerId: z.string(),
    answer: z.any(),
  }),
  z.object({
    type: z.literal("webrtc-ice-candidate"),
    roomId: z.string(),
    targetPeerId: z.string(),
    candidate: z.any(),
  }),
  z.object({
    type: z.literal("participant-update"),
    roomId: z.string(),
    peerId: z.string(),
    audioEnabled: z.boolean().optional(),
    videoEnabled: z.boolean().optional(),
  }),
]);

export type WSMessage = z.infer<typeof wsMessageSchema>;
