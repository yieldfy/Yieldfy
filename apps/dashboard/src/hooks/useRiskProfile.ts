import { useCallback, useEffect, useState } from "react";
import type { RiskProfile } from "@yieldfy/sdk";

const STORAGE_KEY = "yieldfy:risk-profile";
const DEFAULT: RiskProfile = "balanced";

const isRiskProfile = (v: unknown): v is RiskProfile =>
  v === "conservative" || v === "balanced" || v === "opportunistic";

function read(): RiskProfile {
  if (typeof window === "undefined") return DEFAULT;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return isRiskProfile(raw) ? raw : DEFAULT;
}

export function useRiskProfile(): [RiskProfile, (p: RiskProfile) => void] {
  const [profile, setProfileState] = useState<RiskProfile>(read);

  // Keep tabs in sync when the preference changes in another window.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      if (isRiskProfile(e.newValue)) setProfileState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setProfile = useCallback((p: RiskProfile) => {
    window.localStorage.setItem(STORAGE_KEY, p);
    setProfileState(p);
  }, []);

  return [profile, setProfile];
}
