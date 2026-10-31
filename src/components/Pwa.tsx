"use client";
// Registers the service worker (production only) and shows a calm notice when the phone is offline.
import { useEffect, useState } from "react";

export function Pwa() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* app still works without it */ });
    }
    const up = () => setOnline(navigator.onLine);
    up();
    window.addEventListener("online", up); window.addEventListener("offline", up);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", up); };
  }, []);
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-3 top-3 z-[60] mx-auto max-w-md rounded-2xl bg-ink px-4 py-3 text-[15px] text-paper shadow-lg">
      <b>You&apos;re offline.</b> Check-ins, scores and stats still save on this phone.
    </div>
  );
}
