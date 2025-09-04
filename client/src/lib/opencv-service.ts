interface OpenCVConfig {
  threshold: number;
  autoCrop: boolean;
  minContourArea: number;
  maxContourArea: number;
  aspectRatioMin: number;
  aspectRatioMax: number;
}

export class OpenCVService {
  private static instance: OpenCVService;
  private config: OpenCVConfig;

  private constructor() {
    this.config = {
      threshold: 128,
      autoCrop: true,
      minContourArea: 500,
      maxContourArea: 50000,
      aspectRatioMin: 1.2,
      aspectRatioMax: 3.0,
    };
  }

  public static getInstance(): OpenCVService {
    if (!OpenCVService.instance) {
      OpenCVService.instance = new OpenCVService();
    }
    return OpenCVService.instance;
  }

  public updateConfig(newConfig: Partial<OpenCVConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): OpenCVConfig {
    return { ...this.config };
  }

  public isDigitValid(digit: string): boolean {
    // Check if the detected character is a valid digit or common display character
    const validChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '-', ' '];
    return validChars.includes(digit);
  }

  public formatReadingValue(rawValue: string): string {
    if (!rawValue) return "0";

    // Clean up the raw value
    let cleaned = rawValue.replace(/[^0-9.\-]/g, '');
    
    // Handle multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }

    // Handle leading/trailing issues
    cleaned = cleaned.replace(/^\./, '0.');
    cleaned = cleaned.replace(/\.$/, '');
    
    // Handle empty or invalid strings
    if (!cleaned || cleaned === '-' || cleaned === '.') {
      return "0";
    }

    return cleaned;
  }

  public calculateConfidence(segments: any[], rawValue: string): number {
    if (!segments.length) return 0;

    let totalConfidence = 0;
    let validDigits = 0;

    segments.forEach(segmentState => {
      const activeSegments = Object.values(segmentState).filter(Boolean).length;
      
      // Higher confidence for segments that have 2-7 active segments (valid range for digits)
      if (activeSegments >= 2 && activeSegments <= 7) {
        totalConfidence += 0.8 + (activeSegments / 7) * 0.2;
        validDigits++;
      } else if (activeSegments === 1) {
        // Could be a '1' or malformed digit
        totalConfidence += 0.6;
        validDigits++;
      } else {
        // No segments or all segments (likely noise)
        totalConfidence += 0.1;
        validDigits++;
      }
    });

    const averageConfidence = validDigits > 0 ? totalConfidence / validDigits : 0;
    
    // Boost confidence if the value looks like a proper number
    const formattedValue = this.formatReadingValue(rawValue);
    const isValidNumber = !isNaN(parseFloat(formattedValue));
    
    return isValidNumber ? Math.min(averageConfidence * 1.2, 1.0) : averageConfidence * 0.7;
  }

  public enhanceImageForDetection(imageData: ImageData): ImageData {
    // Create a canvas to work with the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return imageData;

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    // Apply contrast enhancement
    const enhancedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = enhancedImageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Increase contrast
      const contrast = 1.5;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      
      data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));     // Red
      data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128)); // Green
      data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128)); // Blue
      // Alpha channel remains unchanged
    }

    return enhancedImageData;
  }
}

export const opencvService = OpenCVService.getInstance();
