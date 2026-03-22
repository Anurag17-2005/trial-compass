import { useEffect, useState } from "react";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useLocation } from "react-router-dom";

const OnboardingTour = () => {
  const [hasSeenTour, setHasSeenTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const location = useLocation();

  useEffect(() => {
    // Check if user has already seen the tour
    const tourCompleted = localStorage.getItem("onboarding-tour-completed");
    
    if (tourCompleted) {
      setHasSeenTour(true);
      return;
    }

    // Only start tour on home page
    if (location.pathname !== "/") {
      return;
    }

    // Wait a bit for the page to fully render
    const timer = setTimeout(() => {
      startTour();
    }, 1000);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      allowClose: false, // Prevent closing until completion
      steps: [
        {
          element: '[data-tour="nav-ai-assistant"]',
          popover: {
            title: "Welcome! 👋",
            description: "Let's take a quick tour. First, click on the 'AI Assistant' link to get started with finding clinical trials.",
            side: "bottom",
            align: "start",
            showButtons: ["close"], // Only show close, no next button
            onNextClick: () => {
              // This won't be called since we hide the next button
            }
          }
        }
      ],
      onDestroyStarted: () => {
        if (driverObj.getActiveIndex() === 0) {
          // User tried to close on first step
          const confirmClose = confirm("Are you sure you want to skip the tour? You can restart it later from the help menu.");
          if (confirmClose) {
            localStorage.setItem("onboarding-tour-completed", "true");
            setHasSeenTour(true);
            driverObj.destroy();
          } else {
            return false; // Prevent closing
          }
        } else {
          localStorage.setItem("onboarding-tour-completed", "true");
          setHasSeenTour(true);
          driverObj.destroy();
        }
      }
    });

    driverObj.drive();
    setTourStep(1);

    // Listen for navigation to /assistant
    const checkNavigation = setInterval(() => {
      if (window.location.pathname === "/assistant") {
        clearInterval(checkNavigation);
        driverObj.destroy();
        
        // Wait for assistant page to load, then continue tour
        setTimeout(() => {
          continueAssistantTour();
        }, 500);
      }
    }, 100);

    // Cleanup after 30 seconds if user doesn't navigate
    setTimeout(() => {
      clearInterval(checkNavigation);
    }, 30000);
  };

  const continueAssistantTour = () => {
    const assistantDriver = driver({
      showProgress: true,
      allowClose: true,
      steps: [
        {
          element: '[data-tour="progress-bar"]',
          popover: {
            title: "Track Your Progress",
            description: "This progress bar shows how much of your profile is complete. Answer the questions to move forward.",
            side: "bottom",
            align: "start"
          }
        },
        {
          element: '[data-tour="chat-input"]',
          popover: {
            title: "Chat with the Assistant",
            description: "Type your responses here. The AI will ask you questions about your condition to find matching trials.",
            side: "top",
            align: "start"
          }
        },
        {
          element: '[data-tour="upload-btn"]',
          popover: {
            title: "Upload Medical Reports (Optional)",
            description: "You can speed up the process by uploading your pathology report or lab results (PDF or image). The AI will extract relevant information automatically.",
            side: "top",
            align: "start"
          }
        },
        {
          element: '[data-tour="map-panel"]',
          popover: {
            title: "Interactive Map",
            description: "Once trials are found, they'll appear on this map. Click markers to see details and routes from your location.",
            side: "left",
            align: "start"
          }
        },
        {
          popover: {
            title: "Complete the Conversation",
            description: "Now, answer the AI's questions to complete your profile. Once trials are found, you can click 'View Summary' on any trial card to see detailed information. The tour will end here - good luck finding the right trial! 🎯",
            side: "top",
            align: "center"
          }
        }
      ],
      onDestroyStarted: () => {
        localStorage.setItem("onboarding-tour-completed", "true");
        setHasSeenTour(true);
        assistantDriver.destroy();
      }
    });

    assistantDriver.drive();
    setTourStep(2);
  };

  // Provide a way to restart the tour
  useEffect(() => {
    const handleRestartTour = () => {
      localStorage.removeItem("onboarding-tour-completed");
      setHasSeenTour(false);
      setTourStep(0);
      window.location.href = "/";
    };

    window.addEventListener("restart-onboarding-tour", handleRestartTour);
    return () => window.removeEventListener("restart-onboarding-tour", handleRestartTour);
  }, []);

  return null;
};

export default OnboardingTour;
