import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertReadingSchema, insertSettingSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all readings with pagination
  app.get("/api/readings", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const readings = await storage.getAllReadings(limit, offset);
      const totalCount = await storage.getReadingsCount();
      
      res.json({
        readings,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch readings" });
    }
  });

  // Get reading by ID
  app.get("/api/readings/:id", async (req, res) => {
    try {
      const reading = await storage.getReading(req.params.id);
      if (!reading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      res.json(reading);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reading" });
    }
  });

  // Create new reading
  app.post("/api/readings", async (req, res) => {
    try {
      const validatedData = insertReadingSchema.parse(req.body);
      const reading = await storage.createReading(validatedData);
      res.status(201).json(reading);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create reading" });
    }
  });

  // Delete reading
  app.delete("/api/readings/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteReading(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Reading not found" });
      }
      res.json({ message: "Reading deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete reading" });
    }
  });

  // Get readings by date range
  app.get("/api/readings/range/:startDate/:endDate", async (req, res) => {
    try {
      const startDate = new Date(req.params.startDate);
      const endDate = new Date(req.params.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      const readings = await storage.getReadingsByDateRange(startDate, endDate);
      res.json(readings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch readings by date range" });
    }
  });

  // Get all settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Get setting by key
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  // Update setting
  app.put("/api/settings/:key", async (req, res) => {
    try {
      const validatedData = insertSettingSchema.parse({
        key: req.params.key,
        value: req.body.value
      });
      const setting = await storage.setSetting(validatedData);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Delete setting
  app.delete("/api/settings/:key", async (req, res) => {
    try {
      const deleted = await storage.deleteSetting(req.params.key);
      if (!deleted) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json({ message: "Setting deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete setting" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
