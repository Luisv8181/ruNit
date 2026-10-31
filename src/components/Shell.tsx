"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { ago } from "@/lib/util";
import { I } from "./icons";
import { Logo } from "./ui";

const NAV = [
  { href: "/", label: "Home", icon: I.Home },
  { href: "/courts", label: "Courts", icon: I.Map },
  { href: "/community", label: "Community", icon: I.Users },
  { href: "/my-game", label: "My Game", icon: I.Ball },
  { href: "/opportunities", label: "Opportunities", icon: I.Door },
];

function active(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

function Notices() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const unread = state.notices.filter((n) => !n.read).length;
  useEffect(() => {
    const f = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button aria-label={`Notifications, ${unread} unread`} className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5" onClick={() => setOpen((o) => !o)}>
        <I.Bell />
        {unread > 0 && <span className="num absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-ball px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="rise absolute right-0 top-12 z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-paper-line bg-paper shadow-[0_24px_60px_-20px_rgba(32,43,48,.45)]">
          <div className="eyebrow border-b border-paper-line px-4 py-3">Notifications</div>
          {state.notices.length === 0 && <p className="px-4 py-6 text-sm text-ink-2">Nothing yet.</p>}
          <ul className="max-h-[60vh] overflow-auto">
            {state.notices.map((n) => (
              <li key={n.id}>
                <button
                  className={`block w-full px-4 py-3 text-left hover:bg-ink/[.03] ${n.read ? "opacity-60" : ""}`}
                  onClick={() => { dispatch({ type: "readNotice", id: n.id }); setOpen(false); if (n.href) router.push(n.href); }}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ball" />}
                    <div>
                      <div className="text-sm font-semibold">{n.title}</div>
                      <div className="mt-0.5 text-[13px] text-ink-2">{n.body}</div>
                      <div className="mt-1 text-[11px] text-ink-3">{ago(n.at)}</div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { dispatch } = useStore();
  const immersive = path.startsWith("/runs/") && path.includes("/live");
  return (
    <div className="relative z-[1] min-h-screen">
      <div className="flex items-center justify-center gap-3 bg-ink px-4 py-1.5 text-center text-[11px] font-medium text-paper/80">
        <span><b className="text-sun">Demo build.</b> Every player, court, game and listing here is fictional sample data for Hazleton &amp; Scranton.</span>
        <button className="underline decoration-paper/30 underline-offset-2 hover:text-paper" onClick={() => { if (confirm("Reset the demo to its starting state?")) dispatch({ type: "reset" }); }}>Reset demo</button>
      </div>

      {!immersive && (
        <header className="sticky top-0 z-40 border-b border-paper-line/80 bg-paper/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
            <Link href="/" className="shrink-0"><Logo /></Link>
            <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Primary">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${active(path, n.href) ? "bg-ink text-paper" : "text-ink-2 hover:bg-ink/5 hover:text-ink"}`}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2 md:ml-0">
              <Notices />
              <Link href="/create" className="btn-ball hidden md:inline-flex"><I.Plus width={16} height={16} /> Create a run</Link>
            </div>
          </div>
        </header>
      )}

      <main className={`mx-auto max-w-6xl px-4 sm:px-6 ${immersive ? "" : "pb-32 pt-6 md:pb-16 md:pt-8"}`}>{children}</main>

      {!immersive && (
        <>
          {!path.startsWith("/create") && !path.startsWith("/runs/") && !path.startsWith("/my-game/customize") && (
            <Link href="/create" aria-label="Create a run" className="btn-ball fixed bottom-[84px] right-4 z-40 h-14 w-14 !p-0 md:hidden"><I.Plus width={24} height={24} /></Link>
          )}
          <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-paper-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
            <ul className="grid grid-cols-5">
              {NAV.map((n) => {
                const on = active(path, n.href);
                return (
                  <li key={n.href}>
                    <Link href={n.href} className={`flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold ${on ? "text-ball" : "text-ink-3"}`}>
                      <n.icon width={21} height={21} />
                      {n.label === "Opportunities" ? "Opps" : n.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
