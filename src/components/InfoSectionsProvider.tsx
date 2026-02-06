"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface InfoSectionsContextType {
  showInfoSections: boolean;
  setShowInfoSections: (show: boolean) => void;
  toggleInfoSections: () => void;
}

const InfoSectionsContext = createContext<InfoSectionsContextType | undefined>(undefined);

export function InfoSectionsProvider({ children }: { children: React.ReactNode }) {
  const [showInfoSections, setShowInfoSections] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("showInfoSections");
    if (stored !== null) {
      setShowInfoSections(stored === "true");
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("showInfoSections", String(showInfoSections));
    }
  }, [showInfoSections, mounted]);

  const toggleInfoSections = () => {
    setShowInfoSections((prev) => !prev);
  };

  return (
    <InfoSectionsContext.Provider value={{ showInfoSections, setShowInfoSections, toggleInfoSections }}>
      {children}
    </InfoSectionsContext.Provider>
  );
}

export function useInfoSections() {
  const context = useContext(InfoSectionsContext);
  if (!context) {
    throw new Error("useInfoSections must be used within an InfoSectionsProvider");
  }
  return context;
}
