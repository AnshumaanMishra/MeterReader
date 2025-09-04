import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCamera } from "@/hooks/use-camera";
import { useTesseract } from "@/hooks/use-tesseract";
import { speechService } from "@/lib/speech-service";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Camera, Play, Trash2, Volume2, Loader2 } from "lucide-react";
import { InsertReading } from "@shared/schema";

interface CameraViewProps {
  captureMode: "manual" | "auto";
}

export default function CameraView({ captureMode }: CameraViewProps) {
  const [currentReading, setCurrentReading] = useState("0.00");
  const [selectedQuantity, setSelectedQuantity] = useState("voltage");
  const [selectedUnit, setSelectedUnit] = useState("V");
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoInterval, setAutoInterval] = useState<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { 
    stream, 
    error: cameraError, 
    isLoading: cameraLoading, 
    isActive: cameraActive,
    videoRef,
    startCamera,
    stopCamera,
    captureFrame 
  } = useCamera({
    video: {
      facingMode: "environment",
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  });

  // Debug camera state and ensure stream is connected
  useEffect(() => {
    console.log("Camera state:", {
      stream: !!stream,
      cameraActive,
      cameraLoading,
      cameraError,
      videoElement: !!videoRef.current,
      videoDimensions: videoRef.current ? {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      } : null
    });

    // Ensure video stream is connected when available
    if (stream && videoRef.current && videoRef.current.srcObject !== stream) {
      console.log("Connecting stream to video element");
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(error => {
        console.warn("Video play failed:", error);
      });
    }
  }, [stream, cameraActive, cameraLoading, cameraError]);

  const { isReady: ocrReady, isLoading: ocrLoading, error: ocrError, processImage } = useTesseract();

  const createReadingMutation = useMutation({
    mutationFn: async (reading: InsertReading) => {
      const response = await apiRequest("POST", "/api/readings", reading);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/readings"] });
      toast({
        title: "Reading Captured",
        description: `${currentReading} ${selectedUnit} saved successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save reading",
        variant: "destructive",
      });
    },
  });

  // Quantity to unit mapping
  const quantityUnits = {
    voltage: ["V", "mV", "kV"],
    current: ["A", "mA", "μA"],
    resistance: ["Ω", "kΩ", "MΩ"],
    frequency: ["Hz", "kHz", "MHz"],
    capacitance: ["F", "μF", "nF", "pF"],
  };

  useEffect(() => {
    // Auto-select appropriate unit when quantity changes
    const units = quantityUnits[selectedQuantity as keyof typeof quantityUnits];
    if (units && !units.includes(selectedUnit)) {
      setSelectedUnit(units[0]);
    }
  }, [selectedQuantity, selectedUnit]);

  useEffect(() => {
    // Start camera when component mounts
    if (!cameraActive && !cameraLoading) {
      startCamera();
    }

    return () => {
      stopCamera();
      if (autoInterval) {
        clearInterval(autoInterval);
      }
    };
  }, []);

  useEffect(() => {
    // Handle auto capture mode
    if (captureMode === "auto" && cameraActive && ocrReady && videoRef.current) {
      // Wait for video to have valid dimensions before starting auto-capture
      const checkVideoReady = () => {
        const video = videoRef.current;
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          const interval = setInterval(() => {
            // Double-check video is still ready before each capture
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              handleCapture(true); // Auto capture WITH saving
            }
          }, 5000);
          
          setAutoInterval(interval);
        } else {
          // Video not ready yet, check again in 500ms
          setTimeout(checkVideoReady, 500);
        }
      };
      
      checkVideoReady();
      
      return () => {
        if (autoInterval) {
          clearInterval(autoInterval);
          setAutoInterval(null);
        }
      };
    } else if (autoInterval) {
      clearInterval(autoInterval);
      setAutoInterval(null);
    }
  }, [captureMode, cameraActive, ocrReady]);

  const processFrame = async () => {
    if (!ocrReady || !cameraActive) return;

    const imageData = captureFrame();
    if (!imageData) {
      console.warn("No image data captured");
      return;
    }

    setIsProcessing(true);

    try {
      console.log("Processing frame with Tesseract - dimensions:", imageData.width, "x", imageData.height);
      
      // Process with Tesseract OCR
      const result = await processImage(imageData);
      
      console.log("Tesseract processing result:", result);
      
      if (result && result.value && result.value !== "0") {
        console.log("Detected value:", result.value, "confidence:", result.confidence);
        
        setCurrentReading(result.value);
        setConfidence(result.confidence);
      } else {
        console.log("No valid digits detected from image");
        // Don't update reading if nothing detected
      }
    } catch (error) {
      console.error("Error processing frame:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCapture = async (shouldSave: boolean = true) => {
    await processFrame();
    
    if (shouldSave && currentReading !== "0.00") {
      const reading: InsertReading = {
        value: currentReading,
        quantity: selectedQuantity,
        unit: selectedUnit,
        mode: captureMode,
        confidence: confidence.toString(),
      };

      createReadingMutation.mutate(reading);

      // Auto-play speech if enabled
      try {
        await speechService.speakReading(currentReading, selectedQuantity, selectedUnit);
      } catch (error) {
        console.error("Speech synthesis error:", error);
      }
    }
  };

  const handlePlayReading = async () => {
    try {
      await speechService.speakReading(currentReading, selectedQuantity, selectedUnit);
      toast({
        title: "Reading Spoken",
        description: `Played: ${currentReading} ${selectedUnit}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Text-to-speech is not available",
        variant: "destructive",
      });
    }
  };

  const handleClearReading = () => {
    setCurrentReading("0.00");
    setConfidence(0);
    toast({
      title: "Reading Cleared",
      description: "Current reading has been reset",
    });
  };

  const getStatusIndicator = () => {
    if (cameraLoading || ocrLoading) {
      return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />;
    }
    if (cameraError || !ocrReady) {
      return <div className="w-2 h-2 bg-red-500 rounded-full" />;
    }
    if (cameraActive && ocrReady) {
      return <div className="w-2 h-2 bg-green-500 rounded-full status-indicator" />;
    }
    return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
  };

  const getStatusText = () => {
    if (cameraLoading) return "Starting camera...";
    if (ocrLoading) return "Loading OCR engine...";
    if (cameraError) return `Camera error: ${cameraError}`;
    if (!ocrReady) return "OCR not ready";
    if (isProcessing) return "Processing image...";
    if (cameraActive && ocrReady) return "Ready for capture";
    return "Inactive";
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-6">
      {/* Camera Preview */}
      <section role="group" aria-labelledby="camera-section">
        <h2 id="camera-section" className="text-lg font-semibold mb-4">Camera View</h2>
        
        <div className="camera-preview rounded-xl">
          {cameraActive && stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              aria-label="Camera feed showing multimeter display"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground absolute inset-0">
              <div className="text-center">
                <Camera className="w-12 h-12 mb-2 mx-auto" />
                <p className="text-sm">
                  {cameraLoading ? "Starting camera..." : cameraError || "Camera feed will appear here"}
                </p>
                <p className="text-xs mt-1">Position multimeter display in frame</p>
                {cameraError && (
                  <Button 
                    size="sm" 
                    className="mt-3" 
                    onClick={startCamera}
                    data-testid="button-retry-camera"
                  >
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Status Indicators */}
        <div className="mt-4 flex justify-center space-x-4">
          <div className="flex items-center space-x-2">
            {getStatusIndicator()}
            <span className="text-xs text-muted-foreground">{getStatusText()}</span>
          </div>
          {confidence > 0 && (
            <Badge variant={confidence > 0.7 ? "default" : "secondary"}>
              {Math.round(confidence * 100)}% confidence
            </Badge>
          )}
        </div>
      </section>

      {/* Current Reading Display */}
      <section role="group" aria-labelledby="reading-section">
        <h2 id="reading-section" className="text-lg font-semibold mb-4">Current Reading</h2>
        <Card className="segment-display">
          <CardContent className="text-center p-6">
            <div 
              className="reading-display text-green-400 mb-4" 
              aria-live="polite" 
              role="status"
              data-testid="text-current-reading"
            >
              {currentReading}
            </div>
            <div className="flex justify-center items-center space-x-4">
              <Select value={selectedQuantity} onValueChange={setSelectedQuantity}>
                <SelectTrigger className="w-32" aria-label="Measurement quantity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="voltage">Voltage</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="resistance">Resistance</SelectItem>
                  <SelectItem value="frequency">Frequency</SelectItem>
                  <SelectItem value="capacitance">Capacitance</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="w-24" aria-label="Unit of measurement">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quantityUnits[selectedQuantity as keyof typeof quantityUnits]?.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Control Buttons */}
      <section role="group" aria-labelledby="controls-section">
        <h2 id="controls-section" className="text-lg font-semibold mb-4">Controls</h2>
        <div className="space-y-3">
          <Button
            onClick={() => handleCapture(true)}
            disabled={!cameraActive || !ocrReady || createReadingMutation.isPending}
            className="w-full h-14 text-lg font-semibold"
            data-testid="button-capture-reading"
          >
            {createReadingMutation.isPending ? (
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            ) : (
              <Camera className="w-5 h-5 mr-3" />
            )}
            {captureMode === "auto" ? "Force Capture" : "Capture Reading"}
          </Button>
          
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={handlePlayReading}
              className="flex-1"
              data-testid="button-play-reading"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Play Reading
            </Button>
            <Button
              variant="secondary"
              onClick={handleClearReading}
              className="flex-1"
              data-testid="button-clear-reading"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
