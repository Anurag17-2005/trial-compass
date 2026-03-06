import { useState } from "react";
import Header from "@/components/Header";
import ChatPanel from "@/components/ChatPanel";
import MapPanel from "@/components/MapPanel";
import { Trial } from "@/data/types";
import { trials } from "@/data/trials";

const AssistantPage = () => {
  const [mapTrials, setMapTrials] = useState<Trial[]>(trials);

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full lg:w-[38%] border-r border-border">
          <ChatPanel onTrialsFound={(found) => setMapTrials(found)} />
        </div>
        <div className="hidden lg:block flex-1">
          <MapPanel trials={mapTrials} />
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;
