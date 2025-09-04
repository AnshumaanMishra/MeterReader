import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { opencvService } from "@/lib/opencv-service";
import { speechService } from "@/lib/speech-service";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { Setting } from "@shared/schema";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Setting[];
}

export default function SettingsModal({ open, onOpenChange, settings }: SettingsModalProps) {
  const [threshold, setThreshold] = useState(128);
  const [autoCrop, setAutoCrop] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [selectedVoice, setSelectedVoice] = useState("default");
  const [autoInterval, setAutoInterval] = useState(5);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await apiRequest("PUT", `/api/settings/${key}`, { value });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error) => {
      toast({
        title: "Settings Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  // Load settings when modal opens or settings change
  useEffect(() => {
    if (settings && settings.length > 0) {
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      setThreshold(parseInt(settingsMap.threshold || "128"));
      setAutoCrop(settingsMap.autoCrop === "true");
      setSpeechRate(parseFloat(settingsMap.speechRate || "1"));
      setSelectedVoice(settingsMap.selectedVoice || "default");
      setAutoInterval(parseInt(settingsMap.autoInterval || "5"));
    }
  }, [settings]);

  const availableVoices = speechService.getAvailableVoices();

  const handleSaveSettings = async () => {
    try {
      // Update OpenCV service
      opencvService.updateConfig({
        threshold,
        autoCrop,
      });

      // Update speech service
      speechService.updateConfig({
        rate: speechRate,
        voice: selectedVoice,
      });

      // Save to backend
      const settingsToUpdate = [
        { key: "threshold", value: threshold.toString() },
        { key: "autoCrop", value: autoCrop.toString() },
        { key: "speechRate", value: speechRate.toString() },
        { key: "selectedVoice", value: selectedVoice },
        { key: "autoInterval", value: autoInterval.toString() },
      ];

      for (const setting of settingsToUpdate) {
        await updateSettingMutation.mutateAsync(setting);
      }

      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated",
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Save Error",
        description: "Failed to save some settings",
        variant: "destructive",
      });
    }
  };

  const handleTestSpeech = async () => {
    try {
      speechService.updateConfig({
        rate: speechRate,
        voice: selectedVoice,
      });
      
      await speechService.speak("Test speech with current settings. Voltage reading: 123.45 volts");
      
      toast({
        title: "Speech Test",
        description: "Playing test speech with current settings",
      });
    } catch (error) {
      toast({
        title: "Speech Error",
        description: "Text-to-speech is not available",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Settings
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              aria-label="Close settings"
              data-testid="button-close-settings"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* OpenCV Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Image Processing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="threshold-slider">
                  Threshold: {threshold}
                </Label>
                <Slider
                  id="threshold-slider"
                  min={0}
                  max={255}
                  step={1}
                  value={[threshold]}
                  onValueChange={(value) => setThreshold(value[0])}
                  className="w-full"
                  data-testid="slider-threshold"
                />
                <p className="text-xs text-muted-foreground">
                  Adjust to improve digit detection in different lighting conditions
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-crop-switch">Auto Crop Display</Label>
                <Switch
                  id="auto-crop-switch"
                  checked={autoCrop}
                  onCheckedChange={setAutoCrop}
                  data-testid="switch-auto-crop"
                />
              </div>
            </CardContent>
          </Card>

          {/* Speech Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Speech Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="speech-rate-slider">
                  Speech Rate: {speechRate}x
                </Label>
                <Slider
                  id="speech-rate-slider"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={[speechRate]}
                  onValueChange={(value) => setSpeechRate(value[0])}
                  className="w-full"
                  data-testid="slider-speech-rate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-select">Voice</Label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger id="voice-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default System Voice</SelectItem>
                    {availableVoices.map((voice) => (
                      <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                onClick={handleTestSpeech}
                className="w-full"
                data-testid="button-test-speech"
              >
                Test Speech
              </Button>
            </CardContent>
          </Card>

          {/* Auto Mode Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auto Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auto-interval-input">
                  Capture Interval (seconds)
                </Label>
                <Input
                  id="auto-interval-input"
                  type="number"
                  min={1}
                  max={60}
                  value={autoInterval}
                  onChange={(e) => setAutoInterval(parseInt(e.target.value) || 5)}
                  data-testid="input-auto-interval"
                />
                <p className="text-xs text-muted-foreground">
                  How often to automatically capture readings in auto mode
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex space-x-2 pt-4">
            <Button
              onClick={handleSaveSettings}
              disabled={updateSettingMutation.isPending}
              className="flex-1"
              data-testid="button-save-settings"
            >
              {updateSettingMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              data-testid="button-cancel-settings"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
