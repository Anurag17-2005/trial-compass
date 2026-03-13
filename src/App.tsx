import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AssistantProvider } from "@/contexts/AssistantContext";
import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import AssistantPage from "./pages/AssistantPage";
import TrialDetailPage from "./pages/TrialDetailPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AssistantProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/trial/:id" element={<TrialDetailPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AssistantProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
