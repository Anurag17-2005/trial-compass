import { createContext, useContext, useState, ReactNode } from "react";
import { ChatMessage, Trial, UserProfile } from "@/data/types";

interface AssistantContextType {
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  mapTrials: Trial[];
  setMapTrials: (trials: Trial[]) => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  selectedSummaryTrial: Trial | null;
  setSelectedSummaryTrial: (trial: Trial | null) => void;
  profileReady: boolean;
  setProfileReady: (ready: boolean) => void;
}

// Empty default - everything comes from conversation
const defaultUserProfile: UserProfile = {
  id: "",
  name: "Patient",
  age: 0,
  location: "",
  city: "",
  province: "",
  latitude: 56.1304,  // Center of Canada
  longitude: -106.3468,
  cancer_type: "",
  disease_stage: "",
  biomarkers: [],
  medical_history: "",
};

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultUserProfile);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi there! 👋 I'm here to help you find clinical trials in Canada. Let's start — what type of cancer have you been diagnosed with?",
    },
  ]);
  const [mapTrials, setMapTrials] = useState<Trial[]>([]);
  const [selectedSummaryTrial, setSelectedSummaryTrial] = useState<Trial | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  return (
    <AssistantContext.Provider
      value={{
        messages, setMessages,
        mapTrials, setMapTrials,
        userProfile, setUserProfile,
        selectedSummaryTrial, setSelectedSummaryTrial,
        profileReady, setProfileReady,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) throw new Error("useAssistant must be used within AssistantProvider");
  return context;
};
