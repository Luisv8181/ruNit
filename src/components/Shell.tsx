"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { ago } from "@/lib/util";
import { I } from "./icons";
import { Logo } from "./ui";
import { setSound, soundOn } from "@/lib/feel";
import { THEMES, useTheme } from "@/lib/theme";

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

function SoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(soundOn()), []);
  return (
    <button aria-label={on ? "Turn sounds off" : "Turn sounds on"} aria-pressed={on} title={on ? "Sounds on" : "Sounds off"}
      className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5" onClick={() => { setSound(!on); setOn(!on); }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 10v4h4l5 4V6L8 10H4Z" />
        {on ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="m17 9 5 6M22 9l-5 6" />}
      </svg>
    </button>
  );
}

function LookPicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button aria-label="Change the look" aria-expanded={open} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5" onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.5-1.5-1.6-1.5-3s1.2-2 2.5-2H18a3 3 0 0 0 3-3c0-4.4-4-8-9-8Z" /><circle cx="7.5" cy="11" r="1.2" /><circle cx="10.5" cy="7" r="1.2" /><circle cx="15.5" cy="7.5" r="1.2" />
        </svg>
      </button>
      {open && (
        <div role="menu" aria-label="Look" className="rise absolute right-0 top-12 z-50 w-[min(92vw,300px)] overflow-hidden rounded-2xl border border-paper-line bg-paper p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,.55)]">
          {THEMES.map((t) => (
            <button key={t.id} role="menuitemradio" aria-checked={theme === t.id} onClick={() => { setTheme(t.id); setOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${theme === t.id ? "bg-ink/[.07]" : "hover:bg-ink/[.04]"}`}>
              <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-lg ring-1 ring-ink/15" aria-hidden>
                {t.swatch.map((c) => <span key={c} className="h-full flex-1" style={{ background: c }} />)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{t.name}</span>
                <span className="block text-[13px] leading-snug text-ink-2">{t.line}</span>
              </span>
              {theme === t.id && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 5 5 9-10" /></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
        {unread > 0 && <span className="num absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-ball px-1 text-[10px] font-bold text-on-ball">{unread}</span>}
      </button>
      {open && (
        <div className="rise absolute right-0 top-12 z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-paper-line bg-paper shadow-[0_24px_60px_-20px_rgba(0,0,0,.5)]">
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
      <div className="scope-night flex items-center justify-center gap-3 bg-ink px-4 py-1.5 text-center text-[13px] text-paper/85">
        <span><span className="sm:hidden">Demo build. Everything here is made up.</span><span className="hidden sm:inline">Demo build. Every player, court, game and listing here is made up.</span></span>
        <button className="shrink-0 whitespace-nowrap underline decoration-paper/30 underline-offset-2 hover:text-paper" onClick={() => { if (confirm("Reset the demo to its starting state?")) dispatch({ type: "reset" }); }}>Reset demo</button>
      </div>

      {!immersive && (
        <header className="sticky top-0 z-40 bg-paper">
          <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-3 px-4 md:gap-8 sm:px-6">
            <Link href="/" className="shrink-0"><Logo size={30} /></Link>
            <nav className="hidden h-full flex-1 items-stretch gap-6 md:flex" aria-label="Primary">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} aria-current={active(path, n.href) ? "page" : undefined} className={`flex items-center border-b-4 pt-1 text-[15px] font-bold transition-colors ${active(path, n.href) ? "border-ball text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-1 md:ml-0 md:gap-2">
              <LookPicker />
              <SoundToggle />
              <Notices />
              <Link href="/create" className="btn-ball !min-h-0 !px-3 !py-2 text-sm md:hidden" aria-label="Call a run"><I.Plus width={16} height={16} />Run</Link>
              <Link href="/create" className="btn-ball hidden md:inline-flex">Call a run</Link>
            </div>
          </div>
        </header>
      )}

      <main className={`mx-auto max-w-6xl px-4 sm:px-6 ${immersive ? "" : "pb-32 pt-6 md:pb-16 md:pt-8"}`}>{children}</main>

      {!immersive && (
        <>
          <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-paper-line bg-paper pb-[env(safe-area-inset-bottom)] md:hidden">
            <ul className="grid grid-cols-5">
              {NAV.map((n) => {
                const on = active(path, n.href);
                return (
                  <li key={n.href}>
                    <Link href={n.href} aria-current={on ? "page" : undefined} className={`flex flex-col items-center gap-1 whitespace-nowrap py-2.5 text-[10.5px] font-bold ${on ? "text-ink" : "text-ink-3"}`}>
                      <n.icon width={22} height={22} className={on ? "text-ball-ink" : ""} />
                      {n.label}
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
