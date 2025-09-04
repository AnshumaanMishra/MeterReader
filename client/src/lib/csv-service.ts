import { Reading } from "@shared/schema";

export class CSVService {
  private static instance: CSVService;

  private constructor() {}

  public static getInstance(): CSVService {
    if (!CSVService.instance) {
      CSVService.instance = new CSVService();
    }
    return CSVService.instance;
  }

  public generateCSV(readings: Reading[]): string {
    if (!readings.length) {
      return "timestamp,value,quantity,unit,mode,confidence\n";
    }

    const headers = ["timestamp", "value", "quantity", "unit", "mode", "confidence"];
    const csvHeader = headers.join(",") + "\n";

    const csvRows = readings.map(reading => {
      const timestamp = new Date(reading.timestamp).toISOString();
      const value = reading.value;
      const quantity = this.escapeCsvField(reading.quantity);
      const unit = this.escapeCsvField(reading.unit);
      const mode = reading.mode;
      const confidence = reading.confidence || "0";

      return `${timestamp},${value},${quantity},${unit},${mode},${confidence}`;
    });

    return csvHeader + csvRows.join("\n");
  }

  public downloadCSV(readings: Reading[], filename?: string): void {
    const csvContent = this.generateCSV(readings);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    
    const defaultFilename = `multimeter_readings_${new Date().toISOString().split('T')[0]}.csv`;
    const finalFilename = filename || defaultFilename;

    if ((navigator as any).msSaveBlob) {
      // IE10+
      (navigator as any).msSaveBlob(blob, finalFilename);
    } else {
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", finalFilename);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    }
  }

  public parseCSV(csvContent: string): Reading[] {
    const lines = csvContent.trim().split("\n");
    
    if (lines.length < 2) {
      throw new Error("CSV file must contain at least a header and one data row");
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    // Validate required headers
    const requiredHeaders = ["timestamp", "value", "quantity", "unit"];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required CSV headers: ${missingHeaders.join(", ")}`);
    }

    const readings: Reading[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      
      if (values.length !== headers.length) {
        console.warn(`Row ${i + 1} has ${values.length} values but expected ${headers.length}. Skipping.`);
        continue;
      }

      try {
        const reading: Reading = {
          id: `csv_${i}_${Date.now()}`,
          timestamp: new Date(values[headers.indexOf("timestamp")]),
          value: values[headers.indexOf("value")],
          quantity: values[headers.indexOf("quantity")],
          unit: values[headers.indexOf("unit")],
          mode: values[headers.indexOf("mode")] || "manual",
          confidence: values[headers.indexOf("confidence")] || null,
        };

        // Validate the reading
        if (isNaN(reading.timestamp.getTime())) {
          console.warn(`Invalid timestamp in row ${i + 1}. Skipping.`);
          continue;
        }

        if (!reading.value || !reading.quantity || !reading.unit) {
          console.warn(`Missing required data in row ${i + 1}. Skipping.`);
          continue;
        }

        readings.push(reading);
      } catch (error) {
        console.warn(`Error parsing row ${i + 1}:`, error);
      }
    }

    return readings;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private escapeCsvField(field: string): string {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  public validateCSVFile(file: File): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        reject(new Error("File must be a CSV file"));
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error("File size must be less than 10MB"));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          this.parseCSV(content);
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  }

  public readCSVFile(file: File): Promise<Reading[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const readings = this.parseCSV(content);
          resolve(readings);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  }
}

export const csvService = CSVService.getInstance();
