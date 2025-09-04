import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const readings = pgTable("readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  value: decimal("value", { precision: 10, scale: 4 }).notNull(),
  quantity: text("quantity").notNull(), // voltage, current, resistance, frequency, capacitance
  unit: text("unit").notNull(), // V, mV, A, mA, Ω, kΩ, Hz, kHz, F, μF, etc.
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  mode: text("mode").notNull(), // manual, auto
  confidence: decimal("confidence", { precision: 5, scale: 4 }), // OCR confidence score 0-1
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertReadingSchema = createInsertSchema(readings).omit({
  id: true,
  timestamp: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertReading = z.infer<typeof insertReadingSchema>;
export type Reading = typeof readings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
