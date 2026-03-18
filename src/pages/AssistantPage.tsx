import { useState, useRef } from "react";
import Header from "@/components/Header";
import ChatPanel from "@/components/ChatPanel";
import MapPanel, { MapPanelRef } from "@/components/MapPanel";
import TrialSummaryPanel from "@/components/TrialSummaryPanel";
import { useAssistant } from "@/contexts/AssistantContext";
import { Trial } from "@/data/types";

const AssistantPage = () => {
  const { userProfile, setUserProfile, mapTrials, selectedSummaryTrial, setSelectedSummaryTrial, profileReady } = useAssistant();
  const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null);
  const mapRef = useRef<MapPanelRef>(null);

  const handleZoomToLocation = (trial: Trial) => {
    if (mapRef.current) mapRef.current.zoomToTrial(trial);
  };

  const handleViewSummary = (trial: Trial) => {
    setSelectedSummaryTrial(trial);
    // Also zoom map to this trial
    if (mapRef.current) mapRef.current.zoomToTrial(trial);
  };

  const handleMapTrialClick = (trial: Trial) => {
    setSelectedTrialId(trial.trial_id);
    setSelectedSummaryTrial(trial);
    setTimeout(() => setSelectedTrialId(null), 100);
  };

  // Only pass userProfile to map/summary when profile is ready from conversation
  const activeProfile = profileReady ? userProfile : undefined;

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header userProfile={activeProfile} onProfileUpdate={setUserProfile} />
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat Panel */}
        <div className="w-full lg:w-[38%] border-r border-border">
          <ChatPanel
            userProfile={userProfile}
            onTrialsFound={(found) => setMapTrials(found)}
            onZoomToLocation={handleZoomToLocation}
            onViewSummary={handleViewSummary}
            selectedTrialId={selectedTrialId}
          />
        </div>

        {/* Right: Map (top 60%) + Summary (bottom 40%) */}
        <div className="hidden lg:flex flex-1 flex-col">
          <div className="h-[60%]">
            <MapPanel
              ref={mapRef}
              trials={mapTrials}
              userProfile={activeProfile}
              onTrialClick={handleMapTrialClick}
            />
          </div>
          <div className="h-[40%]">
            <TrialSummaryPanel
              trial={selectedSummaryTrial}
              userProfile={userProfile}
              onClose={() => setSelectedSummaryTrial(null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;
