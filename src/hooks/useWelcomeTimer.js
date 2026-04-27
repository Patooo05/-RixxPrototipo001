import { useState, useEffect } from "react";

const TIMER_KEY = "rixx_welcome_expiry";
const DURATION  = 10 * 60 * 1000; // 10 min en ms

function getOrCreateExpiry() {
  const stored = sessionStorage.getItem(TIMER_KEY);
  if (stored) return parseInt(stored, 10);
  const expiry = Date.now() + DURATION;
  sessionStorage.setItem(TIMER_KEY, String(expiry));
  return expiry;
}

export function useWelcomeTimer() {
  const [expiry] = useState(getOrCreateExpiry);
  const [secs, setSecs] = useState(() => Math.max(0, Math.round((expiry - Date.now()) / 1000)));

  useEffect(() => {
    if (secs <= 0) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((expiry - Date.now()) / 1000));
      setSecs(remaining);
    }, 1000);
    return () => clearInterval(id);
  }, [expiry]); // eslint-disable-line react-hooks/exhaustive-deps

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return { mm, ss, secs };
}
