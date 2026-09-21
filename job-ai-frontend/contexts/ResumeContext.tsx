"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export interface ResumeProfile {
  id: number;
  file_name?: string;
  skills: string[];
  years_of_experience?: number;
  created_at?: string;
}

interface ResumeContextType {
  profiles: ResumeProfile[];
  selectedProfileId: number | null;
  selectedResume: ResumeProfile | null;
  setSelectedProfileId: (id: number | null) => void;
  refreshProfiles: () => Promise<void>;
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

const STORAGE_KEY = "selectedProfileId";

function readSavedId(): number | null {
  if (typeof window === "undefined") return null;
  const saved = Number(window.localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(saved) && saved > 0 ? saved : null;
}

export function ResumeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ResumeProfile[]>([]);
  const [selectedProfileId, setSelectedProfileIdState] = useState<number | null>(null);

  const refreshProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setSelectedProfileIdState(null);
      return;
    }
    try {
      const res = await api.get("/upload-resume/list");
      const list: ResumeProfile[] = res.data || [];
      setProfiles(list);
      const saved = readSavedId();
      const hasSaved = saved !== null && list.some((p) => p.id === saved);
      setSelectedProfileIdState((cur) => {
        if (cur && list.some((p) => p.id === cur)) return cur;
        if (hasSaved) return saved;
        return list[0]?.id ?? null;
      });
    } catch {
      setProfiles([]);
    }
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(() => refreshProfiles());
  }, [refreshProfiles]);

  const setSelectedProfileId = (id: number | null) => {
    setSelectedProfileIdState(id);
    if (id) {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(id));
      } catch {
        // ignore storage failures
      }
    }
  };

  const selectedResume = profiles.find((p) => p.id === selectedProfileId) || null;

  return (
    <ResumeContext.Provider
      value={{ profiles, selectedProfileId, selectedResume, setSelectedProfileId, refreshProfiles }}
    >
      {children}
    </ResumeContext.Provider>
  );
}

export function useResume() {
  const ctx = useContext(ResumeContext);
  if (!ctx) throw new Error("useResume must be used within ResumeProvider");
  return ctx;
}