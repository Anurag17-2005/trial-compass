import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import ChatPanel from "@/components/ChatPanel";
import MapPanel, { MapPanelRef } from "@/components/MapPanel";
import { useAssistant } from "@/contexts/AssistantContext";
import { Trial } from "@/data/types";

const AssistantPage = () => {
  const { userProfile, setUserProfile, mapTrials, setMapTrials } = useAssistant();
  const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null);
  const mapRef = useRef<MapPanelRef>(null);
  const navigate = useNavigate();

  const handleZoomToLocation = (trial: Trial) => {
    if (mapRef.current) {
      mapRef.current.zoomToTrial(trial);
    }
  };

  const handleViewTrialDetails = (trial: Trial) => {
    navigate(`/trial/${trial.trial_id}`);
  };

  const handleMapTrialClick = (trial: Trial) => {
    // Set the selected trial ID to trigger scroll in ChatPanel
    setSelectedTrialId(trial.trial_id);
    // Reset after a short delay
    setTimeout(() => setSelectedTrialId(null), 100);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header userProfile={userProfile} onProfileUpdate={setUserProfile} />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full lg:w-[38%] border-r border-border">
          <ChatPanel 
            userProfile={userProfile}
            onTrialsFound={(found) => setMapTrials(found)} 
            onZoomToLocation={handleZoomToLocation}
            onViewTrialDetails={handleViewTrialDetails}
            selectedTrialId={selectedTrialId}
          />
        </div>
        <div className="hidden lg:block flex-1">
          <MapPanel 
            ref={mapRef} 
            trials={mapTrials} 
            userProfile={userProfile}
            onTrialClick={handleMapTrialClick}
          />
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;
