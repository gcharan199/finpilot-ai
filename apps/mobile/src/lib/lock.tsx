/**
 * App lock state. The app starts locked; a successful biometric or PIN unlock
 * flips `unlocked` for the session (it re-locks on next cold start).
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

interface LockState {
  unlocked: boolean;
  unlock: () => void;
  lock: () => void;
}

const LockContext = createContext<LockState | null>(null);

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const unlock = useCallback(() => setUnlocked(true), []);
  const lock = useCallback(() => setUnlocked(false), []);
  const value = useMemo(() => ({ unlocked, unlock, lock }), [unlocked, unlock, lock]);
  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock(): LockState {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error("useLock must be used within a LockProvider");
  return ctx;
}
