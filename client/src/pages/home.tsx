import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import CameraView from "@/components/camera-view";
import DataView from "@/components/data-view";
import ReplayView from "@/components/replay-view";
import SettingsModal from "@/components/settings-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Settings, Camera, Table, Play } from "lucide-react";

type Tab = "camera" | "data" | "replay";
type CaptureMode = "manual" | "auto";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("camera");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("manual");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();

  const { data: readingsData } = useQuery({
    queryKey: ["/api/readings"],
    select: (data: any) => data.readings || [],
  });

  const { data: settingsData } = useQuery({
    queryKey: ["/api/settings"],
    select: (data: any) => data || [],
  });

  const readingsCount = readingsData?.length || 0;

  useEffect(() => {
    // Set up service worker for PWA functionality
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  const handleModeChange = (mode: CaptureMode) => {
    setCaptureMode(mode);
    toast({
      title: "Capture Mode Changed",
      description: `Switched to ${mode === "manual" ? "Manual" : "Auto (5s)"} mode`,
    });
  };

  return (
    <main role="main" className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header role="banner" className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Calculator className="text-primary-foreground text-lg" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">MultimeterReader</h1>
              <p className="text-sm text-muted-foreground">7-Segment Display Reader</p>
            </div>
          </div>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Mode Selection */}
      <section className="px-4 py-3 bg-card border-b border-border" role="group" aria-labelledby="mode-selection">
        <div className="max-w-md mx-auto">
          <h2 id="mode-selection" className="text-sm font-semibold text-muted-foreground mb-3">
            Capture Mode
          </h2>
          <div className="flex space-x-2">
            <Button
              variant={captureMode === "manual" ? "default" : "secondary"}
              className="flex-1"
              onClick={() => handleModeChange("manual")}
              aria-pressed={captureMode === "manual"}
              data-testid="button-manual-mode"
            >
              Manual Capture
            </Button>
            <Button
              variant={captureMode === "auto" ? "default" : "secondary"}
              className="flex-1"
              onClick={() => handleModeChange("auto")}
              aria-pressed={captureMode === "auto"}
              data-testid="button-auto-mode"
            >
              Auto (5s)
            </Button>
          </div>
        </div>
      </section>

      {/* Status Bar */}
      <section className="px-4 py-2 bg-muted" role="status" aria-live="polite">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full status-indicator" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">Camera Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" data-testid="text-readings-count">
              {readingsCount} readings
            </Badge>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <nav role="tablist" className="flex bg-card border-b border-border px-4">
        <div className="max-w-md mx-auto flex w-full">
          <Button
            variant="ghost"
            className={`flex-1 rounded-none border-b-2 ${
              activeTab === "camera" 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
            onClick={() => handleTabChange("camera")}
            role="tab"
            aria-selected={activeTab === "camera"}
            aria-controls="camera-panel"
            data-testid="tab-camera"
          >
            <Camera className="w-4 h-4 mr-2" />
            Camera
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 rounded-none border-b-2 ${
              activeTab === "data" 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
            onClick={() => handleTabChange("data")}
            role="tab"
            aria-selected={activeTab === "data"}
            aria-controls="data-panel"
            data-testid="tab-data"
          >
            <Table className="w-4 h-4 mr-2" />
            Data
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 rounded-none border-b-2 ${
              activeTab === "replay" 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
            onClick={() => handleTabChange("replay")}
            role="tab"
            aria-selected={activeTab === "replay"}
            aria-controls="replay-panel"
            data-testid="tab-replay"
          >
            <Play className="w-4 h-4 mr-2" />
            Replay
          </Button>
        </div>
      </nav>

      {/* Tab Panels */}
      <div className="tab-content">
        {activeTab === "camera" && (
          <div id="camera-panel" role="tabpanel" aria-labelledby="camera-tab">
            <CameraView captureMode={captureMode} />
          </div>
        )}
        
        {activeTab === "data" && (
          <div id="data-panel" role="tabpanel" aria-labelledby="data-tab">
            <DataView />
          </div>
        )}
        
        {activeTab === "replay" && (
          <div id="replay-panel" role="tabpanel" aria-labelledby="replay-tab">
            <ReplayView />
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen}
        settings={settingsData}
      />
    </main>
  );
}
