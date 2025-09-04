import { useState, useEffect, useRef } from "react";

declare global {
  interface Window {
    cv: any;
  }
}

interface SegmentState {
  a: boolean;
  b: boolean;
  c: boolean;
  d: boolean;
  e: boolean;
  f: boolean;
  g: boolean;
}

interface DetectionResult {
  value: string;
  confidence: number;
  segments: SegmentState[];
}

export function useOpenCV() {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cvRef = useRef<any>(null);

  useEffect(() => {
    const loadOpenCV = async () => {
      try {
        // Check if OpenCV is already loaded
        if (window.cv && window.cv.Mat) {
          cvRef.current = window.cv;
          setIsReady(true);
          setIsLoading(false);
          return;
        }

        // Load OpenCV.js from CDN
        const script = document.createElement('script');
        script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
        script.async = true;

        script.onload = () => {
          console.log('OpenCV.js script loaded');
          // OpenCV.js is loaded but may not be ready yet
          const checkOpenCVReady = () => {
            try {
              if (window.cv && window.cv.Mat) {
                console.log('OpenCV.js is ready');
                cvRef.current = window.cv;
                setIsReady(true);
                setIsLoading(false);
              } else {
                setTimeout(checkOpenCVReady, 100);
              }
            } catch (checkError) {
              console.error('Error checking OpenCV readiness:', checkError);
              setError("Error initializing OpenCV");
              setIsLoading(false);
              setIsReady(false);
            }
          };
          checkOpenCVReady();
        };

        script.onerror = (error) => {
          console.error("OpenCV.js script loading failed:", error);
          setError("Failed to load OpenCV.js");
          setIsLoading(false);
          setIsReady(false);
        };

        document.head.appendChild(script);

      } catch (err) {
        console.error("OpenCV initialization error:", err);
        setError("Failed to initialize OpenCV");
        setIsLoading(false);
        setIsReady(false);
      }
    };

    loadOpenCV();
  }, []);

  const preprocessImage = (imageData: ImageData, threshold: number = 128): any => {
    if (!cvRef.current || !isReady) return null;

    const cv = cvRef.current;
    
    try {
      // Create OpenCV Mat from ImageData
      const src = cv.matFromImageData(imageData);
      
      // Convert to grayscale
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      
      // Apply Gaussian blur to reduce noise
      const blurred = new cv.Mat();
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
      
      // Apply threshold to create binary image
      const binary = new cv.Mat();
      cv.threshold(blurred, binary, threshold, 255, cv.THRESH_BINARY);
      
      // Clean up intermediate matrices
      src.delete();
      gray.delete();
      blurred.delete();
      
      return binary;
    } catch (err) {
      console.error("Error in image preprocessing:", err);
      return null;
    }
  };

  const detectDisplay = (binaryImage: any): any[] => {
    if (!cvRef.current || !isReady || !binaryImage) return [];

    const cv = cvRef.current;
    
    try {
      // Find contours
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(binaryImage, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      const digitRegions = [];
      
      // Filter contours by area and aspect ratio to find digit regions
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = cv.boundingRect(contour);
        
        // Filter by size and aspect ratio (typical for 7-segment digits)
        const area = rect.width * rect.height;
        const aspectRatio = rect.height / rect.width;
        
        if (area > 500 && area < 50000 && aspectRatio > 1.2 && aspectRatio < 3.0) {
          digitRegions.push(rect);
        }
      }
      
      // Sort regions from left to right
      digitRegions.sort((a, b) => a.x - b.x);
      
      contours.delete();
      hierarchy.delete();
      
      return digitRegions;
    } catch (err) {
      console.error("Error in display detection:", err);
      return [];
    }
  };

  const analyzeSegments = (binaryImage: any, digitRect: any): SegmentState => {
    if (!cvRef.current || !isReady || !binaryImage || !digitRect) {
      return { a: false, b: false, c: false, d: false, e: false, f: false, g: false };
    }

    const cv = cvRef.current;
    
    try {
      // Validate digit rectangle bounds
      if (digitRect.x < 0 || digitRect.y < 0 || 
          digitRect.width <= 0 || digitRect.height <= 0 ||
          digitRect.x + digitRect.width > binaryImage.cols ||
          digitRect.y + digitRect.height > binaryImage.rows) {
        console.warn("Invalid digit rectangle bounds:", digitRect);
        return { a: false, b: false, c: false, d: false, e: false, f: false, g: false };
      }
      
      // Extract digit region
      const digitROI = binaryImage.roi(digitRect);
      
      // Define relative positions for each segment (normalized coordinates)
      const segments = {
        a: { x: 0.2, y: 0.0, w: 0.6, h: 0.15 },  // top
        b: { x: 0.7, y: 0.0, w: 0.15, h: 0.5 },  // top right
        c: { x: 0.7, y: 0.5, w: 0.15, h: 0.5 },  // bottom right
        d: { x: 0.2, y: 0.85, w: 0.6, h: 0.15 }, // bottom
        e: { x: 0.0, y: 0.5, w: 0.15, h: 0.5 },  // bottom left
        f: { x: 0.0, y: 0.0, w: 0.15, h: 0.5 },  // top left
        g: { x: 0.2, y: 0.42, w: 0.6, h: 0.15 }, // middle
      };
      
      const segmentStates: any = {};
      
      Object.entries(segments).forEach(([segmentName, pos]) => {
        const x = Math.floor(pos.x * digitRect.width);
        const y = Math.floor(pos.y * digitRect.height);
        const w = Math.floor(pos.w * digitRect.width);
        const h = Math.floor(pos.h * digitRect.height);
        
        if (x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= digitRect.width && y + h <= digitRect.height) {
          const segmentRect = new cv.Rect(x, y, w, h);
          const segmentROI = digitROI.roi(segmentRect);
          
          // Calculate the ratio of white pixels in the segment
          const whitePixels = cv.countNonZero(segmentROI);
          const totalPixels = w * h;
          const whiteRatio = whitePixels / totalPixels;
          
          // Segment is "on" if more than 30% of pixels are white
          segmentStates[segmentName] = whiteRatio > 0.3;
          
          segmentROI.delete();
        } else {
          segmentStates[segmentName] = false;
        }
      });
      
      digitROI.delete();
      
      return segmentStates;
    } catch (err) {
      console.error("Error in segment analysis:", err);
      return { a: false, b: false, c: false, d: false, e: false, f: false, g: false };
    }
  };

  const segmentsToDigit = (segments: SegmentState): string => {
    // 7-segment display digit patterns
    const digitPatterns: { [key: string]: string } = {
      '1111110': '0',
      '0110000': '1',
      '1101101': '2',
      '1111001': '3',
      '0110011': '4',
      '1011011': '5',
      '1011111': '6',
      '1110000': '7',
      '1111111': '8',
      '1111011': '9',
      '1110111': 'A',
      '0011111': 'b',
      '1001110': 'C',
      '0111101': 'd',
      '1001111': 'E',
      '1000111': 'F',
      '0000000': ' ', // blank/empty
    };

    const pattern = [
      segments.a ? '1' : '0',
      segments.b ? '1' : '0',
      segments.c ? '1' : '0',
      segments.d ? '1' : '0',
      segments.e ? '1' : '0',
      segments.f ? '1' : '0',
      segments.g ? '1' : '0',
    ].join('');

    return digitPatterns[pattern] || '?';
  };

  const processImage = (imageData: ImageData, threshold: number = 128): DetectionResult => {
    if (!isReady) {
      console.log("OpenCV not ready for processing");
      return { value: "", confidence: 0, segments: [] };
    }

    try {
      console.log("Starting image preprocessing with dimensions:", imageData.width, "x", imageData.height);
      
      // Preprocess the image
      const binaryImage = preprocessImage(imageData, threshold);
      if (!binaryImage) {
        console.log("Preprocessing failed - no binary image created");
        return { value: "", confidence: 0, segments: [] };
      }

      console.log("Detecting digit regions...");
      // Detect digit regions
      const digitRegions = detectDisplay(binaryImage);
      console.log("Found", digitRegions.length, "potential digit regions");
      
      if (digitRegions.length === 0) {
        console.log("No digit regions detected");
        binaryImage.delete();
        return { value: "", confidence: 0, segments: [] };
      }

      // Analyze each digit
      const digits: string[] = [];
      const allSegments: SegmentState[] = [];
      let totalConfidence = 0;

      digitRegions.forEach((region, index) => {
        console.log(`Analyzing region ${index}:`, region);
        const segments = analyzeSegments(binaryImage, region);
        const digit = segmentsToDigit(segments);
        
        console.log(`Region ${index} - segments:`, segments, "-> digit:", digit);
        
        digits.push(digit);
        allSegments.push(segments);
        
        // Calculate confidence based on how well the segments match known patterns
        const segmentCount = Object.values(segments).filter(Boolean).length;
        const confidence = digit !== '?' ? 0.9 : Math.max(0.1, segmentCount / 7);
        totalConfidence += confidence;
      });

      const averageConfidence = totalConfidence / digitRegions.length;
      const value = digits.join('');

      console.log("Final processing result:", {
        value,
        confidence: averageConfidence,
        digitCount: digits.length
      });

      binaryImage.delete();

      return {
        value: value,
        confidence: averageConfidence,
        segments: allSegments,
      };

    } catch (err) {
      console.error("Error processing image:", err);
      return { value: "", confidence: 0, segments: [] };
    }
  };

  return {
    isReady,
    isLoading,
    error,
    processImage,
  };
}
