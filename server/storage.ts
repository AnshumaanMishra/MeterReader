import { type Reading, type InsertReading, type Setting, type InsertSetting } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Reading operations
  getReading(id: string): Promise<Reading | undefined>;
  getAllReadings(limit?: number, offset?: number): Promise<Reading[]>;
  createReading(reading: InsertReading): Promise<Reading>;
  deleteReading(id: string): Promise<boolean>;
  getReadingsCount(): Promise<number>;
  getReadingsByDateRange(startDate: Date, endDate: Date): Promise<Reading[]>;
  
  // Settings operations
  getSetting(key: string): Promise<Setting | undefined>;
  getAllSettings(): Promise<Setting[]>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  deleteSetting(key: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private readings: Map<string, Reading>;
  private settings: Map<string, Setting>;

  constructor() {
    this.readings = new Map();
    this.settings = new Map();
    
    // Initialize default settings
    this.initializeDefaultSettings();
  }

  private async initializeDefaultSettings() {
    const defaultSettings = [
      { key: "threshold", value: "128" },
      { key: "autoCrop", value: "true" },
      { key: "speechRate", value: "1" },
      { key: "autoInterval", value: "5" },
      { key: "selectedVoice", value: "default" },
    ];

    for (const setting of defaultSettings) {
      await this.setSetting(setting);
    }
  }

  // Reading methods
  async getReading(id: string): Promise<Reading | undefined> {
    return this.readings.get(id);
  }

  async getAllReadings(limit: number = 100, offset: number = 0): Promise<Reading[]> {
    const allReadings = Array.from(this.readings.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return allReadings.slice(offset, offset + limit);
  }

  async createReading(insertReading: InsertReading): Promise<Reading> {
    const id = randomUUID();
    const reading: Reading = {
      ...insertReading,
      id,
      timestamp: new Date(),
      confidence: insertReading.confidence || null,
    };
    this.readings.set(id, reading);
    return reading;
  }

  async deleteReading(id: string): Promise<boolean> {
    return this.readings.delete(id);
  }

  async getReadingsCount(): Promise<number> {
    return this.readings.size;
  }

  async getReadingsByDateRange(startDate: Date, endDate: Date): Promise<Reading[]> {
    return Array.from(this.readings.values())
      .filter(reading => {
        const readingDate = new Date(reading.timestamp);
        return readingDate >= startDate && readingDate <= endDate;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Settings methods
  async getSetting(key: string): Promise<Setting | undefined> {
    return this.settings.get(key);
  }

  async getAllSettings(): Promise<Setting[]> {
    return Array.from(this.settings.values());
  }

  async setSetting(insertSetting: InsertSetting): Promise<Setting> {
    const existingSetting = this.settings.get(insertSetting.key);
    const setting: Setting = {
      id: existingSetting?.id || randomUUID(),
      key: insertSetting.key,
      value: insertSetting.value,
      updatedAt: new Date(),
    };
    this.settings.set(insertSetting.key, setting);
    return setting;
  }

  async deleteSetting(key: string): Promise<boolean> {
    return this.settings.delete(key);
  }
}

export const storage = new MemStorage();
