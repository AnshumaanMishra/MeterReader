import { useState, useEffect, useRef } from "react";

interface UseCameraOptions {
  video?: MediaTrackConstraints;
  audio?: boolean;
}

interface CameraState {
  stream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  isActive: boolean;
}

export function useCamera(options: UseCameraOptions = {}) {
  const [state, setState] = useState<CameraState>({
    stream: null,
    error: null,
    isLoading: false,
    isActive: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    if (state.isActive) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported in this browser. Please use HTTPS or localhost.");
      }

      // Try different camera configurations, starting with basic ones
      const cameraConfigs = [
        {
          video: {
            facingMode: "environment", // Use back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
            ...options.video,
          },
          audio: options.audio || false,
        },
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        {
          video: true,
          audio: false,
        }
      ];

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;

      for (const constraints of cameraConfigs) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Camera access failed");
          console.warn("Camera config failed, trying next:", constraints, err);
          
          // If it's a permission error, don't try other configs
          if (err instanceof DOMException && err.name === 'NotAllowedError') {
            break;
          }
        }
      }

      if (!stream) {
        throw lastError || new Error("No camera configuration worked. Please check camera permissions.");
      }
      
      setState(prev => ({
        ...prev,
        stream,
        isLoading: false,
        isActive: true,
      }));

      // Attach stream to video element if available
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn("Video play failed:", playError);
          // Don't throw here, just log the warning
        }
      }

    } catch (error) {
      let errorMessage = "Failed to access camera";
      
      if (error instanceof DOMException) {
        console.error("Camera DOMException:", {
          name: error.name,
          message: error.message,
          code: error.code
        });
        
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = "Camera access denied. Please allow camera permissions and try again.";
            break;
          case 'NotFoundError':
            errorMessage = "No camera found. Please ensure a camera is connected.";
            break;
          case 'NotSupportedError':
            errorMessage = "Camera not supported in this browser. Try using HTTPS or a modern browser.";
            break;
          case 'OverconstrainedError':
            errorMessage = "Camera constraints not supported. Trying basic settings...";
            break;
          case 'SecurityError':
            errorMessage = "Camera access blocked for security reasons. Use HTTPS or localhost.";
            break;
          default:
            errorMessage = `Camera error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        // Handle non-Error objects
        console.error("Non-standard error type:", typeof error, error);
        errorMessage = `Unknown error occurred: ${JSON.stringify(error)}`;
      }
      
      console.error("Camera error:", error);
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        isActive: false,
      }));
    }
  };

  const stopCamera = () => {
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
      setState(prev => ({
        ...prev,
        stream: null,
        isActive: false,
      }));

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const captureFrame = (): ImageData | null => {
    if (!videoRef.current || !state.isActive) return null;

    const video = videoRef.current;
    
    // Check if video dimensions are valid
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("Video dimensions not ready:", video.videoWidth, video.videoHeight);
      return null;
    }
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    try {
      context.drawImage(video, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      console.error("Error capturing video frame:", error);
      return null;
    }
  };

  const captureBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !state.isActive) {
        resolve(null);
        return;
      }

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        resolve(null);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return {
    ...state,
    videoRef,
    startCamera,
    stopCamera,
    captureFrame,
    captureBlob,
  };
}
