import { createWorker } from 'tesseract.js';

export class TesseractService {
  private static instance: TesseractService;
  private worker: any = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): TesseractService {
    if (!TesseractService.instance) {
      TesseractService.instance = new TesseractService();
    }
    return TesseractService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log("Initializing Tesseract worker...");
      this.worker = await createWorker('eng', 1, {
        logger: m => console.log('Tesseract:', m)
      });

      // Configure for digital displays
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789.-', // Only digits, decimal point, and minus
        tessedit_pageseg_mode: '8', // Treat image as single word
        tessedit_ocr_engine_mode: '2', // Use LSTM engine only
      });

      this.isInitialized = true;
      console.log("Tesseract worker initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Tesseract:", error);
      throw error;
    }
  }

  public async processImage(imageData: ImageData): Promise<{ value: string; confidence: number }> {
    if (!this.isInitialized || !this.worker) {
      throw new Error("Tesseract not initialized");
    }

    try {
      // Convert ImageData to canvas for better preprocessing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      ctx.putImageData(imageData, 0, 0);

      // Apply preprocessing to enhance digital display detection
      const processedCanvas = this.preprocessForDigitalDisplay(canvas);

      console.log("Processing image with Tesseract...");
      const result = await this.worker.recognize(processedCanvas);
      
      const text = result.data.text.trim();
      const confidence = result.data.confidence / 100; // Convert to 0-1 scale

      console.log("Tesseract result:", { text, confidence });

      // Clean and validate the result
      const cleanedValue = this.cleanDigitalReading(text);
      
      return {
        value: cleanedValue,
        confidence: confidence
      };

    } catch (error) {
      console.error("Error processing image with Tesseract:", error);
      return { value: "", confidence: 0 };
    }
  }

  private preprocessForDigitalDisplay(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert to grayscale and apply high contrast
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      
      // Apply aggressive thresholding for digital displays
      const binary = gray > 128 ? 255 : 0;
      
      data[i] = binary;     // Red
      data[i + 1] = binary; // Green
      data[i + 2] = binary; // Blue
      // Alpha stays the same
    }

    // Create a larger canvas for better recognition
    const scaledCanvas = document.createElement('canvas');
    const scaledCtx = scaledCanvas.getContext('2d')!;
    const scale = 3; // Scale up 3x
    
    scaledCanvas.width = canvas.width * scale;
    scaledCanvas.height = canvas.height * scale;
    
    // Apply the processed image data
    ctx.putImageData(imageData, 0, 0);
    
    // Scale up with nearest neighbor to keep sharp edges
    scaledCtx.imageSmoothingEnabled = false;
    scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

    return scaledCanvas;
  }

  private cleanDigitalReading(text: string): string {
    if (!text) return "";

    // Remove whitespace and common OCR errors
    let cleaned = text.replace(/\s+/g, '');
    
    // Fix common OCR mistakes in digital displays
    cleaned = cleaned.replace(/[Oo]/g, '0'); // O -> 0
    cleaned = cleaned.replace(/[Il|]/g, '1'); // I, l, | -> 1
    cleaned = cleaned.replace(/[Ss]/g, '5'); // S -> 5
    cleaned = cleaned.replace(/[Gg]/g, '6'); // G -> 6
    cleaned = cleaned.replace(/[Bb]/g, '8'); // B -> 8

    // Remove any remaining non-digit/decimal characters except minus sign
    cleaned = cleaned.replace(/[^0-9.\-]/g, '');

    // Handle multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }

    // Handle leading/trailing issues
    cleaned = cleaned.replace(/^\./, '0.');
    cleaned = cleaned.replace(/\.$/, '');
    
    // If empty or just symbols, return "0"
    if (!cleaned || cleaned === '-' || cleaned === '.') {
      return "0";
    }

    return cleaned;
  }

  public async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log("Tesseract worker terminated");
    }
  }
}