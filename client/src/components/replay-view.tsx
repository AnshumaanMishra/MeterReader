import { useState, useEffect, useRef } from "react";
import { csvService } from "@/lib/csv-service";
import { speechService } from "@/lib/speech-service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Play, 
  Pause, 
  OctagonMinus, 
  SkipBack, 
  SkipForward,
  Volume2,
  VolumeX 
} from "lucide-react";
import { Reading } from "@shared/schema";

type PlaybackState = "stopped" | "playing" | "paused";

export default function ReplayView() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("stopped");
  const [playbackSpeed, setPlaybackSpeed] = useState("1");
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [fileName, setFileName] = useState("");
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const currentReading = readings[currentIndex];
  const progress = readings.length > 0 ? (currentIndex / (readings.length - 1)) * 100 : 0;

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await csvService.validateCSVFile(file);
      const loadedReadings = await csvService.readCSVFile(file);
      
      setReadings(loadedReadings);
      setCurrentIndex(0);
      setPlaybackState("stopped");
      setFileName(file.name);
      
      toast({
        title: "CSV File Loaded",
        description: `Loaded ${loadedReadings.length} readings from ${file.name}`,
      });
    } catch (error) {
      toast({
        title: "File Load Error",
        description: error instanceof Error ? error.message : "Failed to load CSV file",
        variant: "destructive",
      });
    }
  };

  const playReading = async (reading: Reading) => {
    if (isTTSEnabled && reading) {
      try {
        await speechService.speakReading(reading.value, reading.quantity, reading.unit);
      } catch (error) {
        console.error("Speech error:", error);
      }
    }
  };

  const startPlayback = () => {
    if (readings.length === 0) return;

    setPlaybackState("playing");
    
    const speed = parseFloat(playbackSpeed);
    const interval = 2000 / speed; // Base interval of 2 seconds

    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = prev + 1;
        
        if (nextIndex >= readings.length) {
          // End of playlist
          setPlaybackState("stopped");
          setCurrentIndex(0);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        
        // Play the reading at the new index
        if (readings[nextIndex]) {
          playReading(readings[nextIndex]);
        }
        
        return nextIndex;
      });
    }, interval);

    // Play current reading immediately
    if (currentReading) {
      playReading(currentReading);
    }
  };

  const pausePlayback = () => {
    setPlaybackState("paused");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    speechService.stop();
  };

  const stopPlayback = () => {
    setPlaybackState("stopped");
    setCurrentIndex(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    speechService.stop();
  };

  const handleTogglePlayback = () => {
    if (playbackState === "playing") {
      pausePlayback();
    } else if (playbackState === "paused") {
      startPlayback();
    } else {
      startPlayback();
    }
  };

  const handlePreviousReading = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    setCurrentIndex(newIndex);
    
    if (readings[newIndex] && isTTSEnabled && playbackState !== "playing") {
      playReading(readings[newIndex]);
    }
  };

  const handleNextReading = () => {
    const newIndex = Math.min(readings.length - 1, currentIndex + 1);
    setCurrentIndex(newIndex);
    
    if (readings[newIndex] && isTTSEnabled && playbackState !== "playing") {
      playReading(readings[newIndex]);
    }
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-6">
      {/* File Selection */}
      <section role="group" aria-labelledby="file-section">
        <h2 id="file-section" className="text-lg font-semibold mb-4">Select CSV File</h2>
        <Card>
          <CardContent className="p-4">
            <Label htmlFor="csv-file-input" className="block text-sm font-medium text-muted-foreground mb-2">
              Choose CSV file to replay
            </Label>
            <div className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <Input
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="flex-1"
                data-testid="input-csv-file"
              />
            </div>
            {fileName && (
              <p className="text-sm text-muted-foreground mt-2">
                Loaded: {fileName} ({readings.length} readings)
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {readings.length > 0 && (
        <>
          {/* Replay Controls */}
          <section role="group" aria-labelledby="replay-controls-section">
            <h2 id="replay-controls-section" className="text-lg font-semibold mb-4">Playback Controls</h2>
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Current Reading Display */}
                <div className="text-center">
                  <div 
                    className="text-3xl font-mono font-bold text-primary mb-2" 
                    aria-live="polite"
                    data-testid="text-replay-reading"
                  >
                    {currentReading ? `${currentReading.value} ${currentReading.unit}` : "No reading"}
                  </div>
                  {currentReading && (
                    <div className="text-sm text-muted-foreground">
                      <div className="capitalize">{currentReading.quantity}</div>
                      <div>Recorded: {formatTimestamp(currentReading.timestamp)}</div>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span data-testid="text-current-index">{currentIndex + 1}</span>
                    <span data-testid="text-total-entries">/ {readings.length} readings</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>

                {/* Playback Speed */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="speed-select" className="text-sm font-medium text-muted-foreground">
                    Playback Speed:
                  </Label>
                  <Select value={playbackSpeed} onValueChange={setPlaybackSpeed}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                      <SelectItem value="5">5x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Control Buttons */}
                <div className="flex space-x-2">
                  <Button
                    onClick={handleTogglePlayback}
                    className="flex-1"
                    data-testid="button-toggle-replay"
                  >
                    {playbackState === "playing" ? (
                      <Pause className="w-4 h-4 mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {playbackState === "playing" ? "Pause" : "Play"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={stopPlayback}
                    data-testid="button-stop-replay"
                  >
                    <OctagonMinus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handlePreviousReading}
                    disabled={currentIndex === 0}
                    data-testid="button-previous-reading"
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleNextReading}
                    disabled={currentIndex === readings.length - 1}
                    data-testid="button-next-reading"
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>

                {/* TTS Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Label htmlFor="tts-toggle" className="text-sm font-medium text-muted-foreground">
                    Text-to-Speech:
                  </Label>
                  <div className="flex items-center space-x-2">
                    {isTTSEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <Switch
                      id="tts-toggle"
                      checked={isTTSEnabled}
                      onCheckedChange={setIsTTSEnabled}
                      data-testid="switch-tts-toggle"
                    />
                    <span className="text-sm text-muted-foreground">
                      {isTTSEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {readings.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No CSV file loaded.</p>
            <p className="text-sm mt-2">Upload a CSV file to start replaying readings.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
