import { useState, useEffect, useRef } from 'react';
import { TesseractService } from '@/lib/tesseract-service';

interface DetectionResult {
  value: string;
  confidence: number;
}

export const useTesseract = () => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef<TesseractService | null>(null);

  useEffect(() => {
    const initializeTesseract = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        serviceRef.current = TesseractService.getInstance();
        await serviceRef.current.initialize();
        
        setIsReady(true);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to initialize Tesseract:", err);
        setError("Failed to initialize OCR engine");
        setIsLoading(false);
        setIsReady(false);
      }
    };

    initializeTesseract();

    // Cleanup on unmount
    return () => {
      if (serviceRef.current) {
        serviceRef.current.terminate().catch(console.error);
      }
    };
  }, []);

  const processImage = async (imageData: ImageData): Promise<DetectionResult> => {
    if (!isReady || !serviceRef.current) {
      console.log("Tesseract not ready for processing");
      return { value: "", confidence: 0 };
    }

    try {
      const result = await serviceRef.current.processImage(imageData);
      return result;
    } catch (error) {
      console.error("Error processing image with Tesseract:", error);
      return { value: "", confidence: 0 };
    }
  };

  return {
    isReady,
    isLoading,
    error,
    processImage,
  };
};