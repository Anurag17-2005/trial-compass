import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ChatMessage, Trial, UserProfile } from "@/data/types";
import { trials } from "@/data/trials";

interface AssistantContextType {
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  mapTrials: Trial[];
  setMapTrials: (trials: Trial[]) => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
}

const defaultUserProfile: UserProfile = {
  id: "user123",
  name: "User",
  age: 45,
  location: "Toronto",
  city: "Toronto",
  province: "Ontario",
  latitude: 43.6629,
  longitude: -79.3957,
  cancer_type: "Lung",
  disease_stage: "Stage III",
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
      content: "Hello! I'm here to help you find clinical trials that match your needs. To get started, I'd like to learn a bit about your condition. What type of cancer have you been diagnosed with?",
    },
  ]);
  const [mapTrials, setMapTrials] = useState<Trial[]>(trials);

  // Keep welcome message conversational
  useEffect(() => {
    // Don't update welcome message automatically
  }, [userProfile]);

  return (
    <AssistantContext.Provider
      value={{
        messages,
        setMessages,
        mapTrials,
        setMapTrials,
        userProfile,
        setUserProfile,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant must be used within AssistantProvider");
  }
  return context;
};
