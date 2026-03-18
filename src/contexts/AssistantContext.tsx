import { createContext, useContext, useState, useRef, ReactNode } from "react";
import { ChatMessage, Trial, UserProfile } from "@/data/types";
import { GroqChatService } from "@/lib/groqService";

interface AssistantContextType {
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  mapTrials: Trial[];
  setMapTrials: (trials: Trial[]) => void;
  allFoundTrials: Trial[];
  setAllFoundTrials: (trials: Trial[]) => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  selectedSummaryTrial: Trial | null;
  setSelectedSummaryTrial: (trial: Trial | null) => void;
  profileReady: boolean;
  setProfileReady: (ready: boolean) => void;
  searchDone: boolean;
  setSearchDone: (done: boolean) => void;
  chatService: GroqChatService;
}

const defaultUserProfile: UserProfile = {
  id: "",
  name: "Patient",
  age: 0,
  location: "",
  city: "",
  province: "",
  latitude: 56.1304,
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
  const [allFoundTrials, setAllFoundTrials] = useState<Trial[]>([]);
  const [selectedSummaryTrial, setSelectedSummaryTrial] = useState<Trial | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const chatServiceRef = useRef(new GroqChatService());

  return (
    <AssistantContext.Provider
      value={{
        messages, setMessages,
        mapTrials, setMapTrials,
        allFoundTrials, setAllFoundTrials,
        userProfile, setUserProfile,
        selectedSummaryTrial, setSelectedSummaryTrial,
        profileReady, setProfileReady,
        searchDone, setSearchDone,
        chatService: chatServiceRef.current,
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
