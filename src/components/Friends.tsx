"use client";

// Friends: add by friend code, QR, phone contacts (Contact Picker API where supported) or an invite link.
// Head-to-head records come from opponent-confirmed games only.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { friendCode, friendLink, headToHead } from "@/lib/friends";
import { archetypeName } from "@/lib/archetypes";
import { Avatar } from "./PlayerFigure";
import { Qr } from "./Qr";
import { Empty } from "./ui";
import { swish, nudge } from "@/lib/feel";

type ContactsApi = { select: (props: string[], opts?: { multiple?: boolean }) => Promise<{ name?: string[]; tel?: string[]; email?: string[] }[]> };

export function Friends() {
  const { state, dispatch, player } = useStore();
  const params = useSearchParams();
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [invited, setInvited] = useState<string[]>([]);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const myCode = friendCode(state.meId);
  const friends = state.friends.map((id) => player(id)).filter((p): p is NonNullable<typeof p> => !!p);
  const rows = useMemo(() => friends.map((p) => ({ p, h: headToHead(state.meId, p.id, state.courtGames) }))
    .sort((a, b) => (b.h.vsW + b.h.vsL + b.h.withW + b.h.withL) - (a.h.vsW + a.h.vsL + a.h.withW + a.h.withL)), [friends, state.meId, state.courtGames]);

  const addByCode = (raw: string) => {
    const want = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const hit = state.players.find((p) => friendCode(p.id).replace("-", "") === want);
    if (!hit) { nudge(); setMsg("No player has that code. Check it with your friend."); return; }
    if (hit.id === state.meId) { setMsg("That's your own code."); return; }
    if (state.friends.includes(hit.id)) { setMsg(`${hit.nickname} is already your friend.`); return; }
    dispatch({ type: "addFriend", playerId: hit.id }); swish();
    setMsg(`${hit.nickname} added.`); setCode("");
  };

  // Invite link opened: /community?add=ABC-DEF
  useEffect(() => {
    const c = params.get("add");
    if (c) { setAdding(true); setCode(c); }
  }, [params]);

  const contactsSupported = typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
  const pickContacts = async () => {
    try {
      const picked = await (navigator as unknown as { contacts: ContactsApi }).contacts.select(["name", "tel"], { multiple: true });
      setInvited(picked.map((c) => c.name?.[0] ?? c.tel?.[0] ?? "Contact"));
      await invite();
    } catch { /* user cancelled */ }
  };
  const invite = async () => {
    const link = friendLink(state.meId, origin);
    const text = `Run it with me on ruNit. My friend code is ${myCode}. ${link}`;
    const nav = navigator as Navigator;
    if (nav.share) { try { await nav.share({ title: "ruNit", text }); setMsg("Invite sent."); } catch { /* cancelled */ } }
    else { try { await navigator.clipboard.writeText(text); setMsg("Invite copied. Paste it in a text."); } catch { setMsg(text); } }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-ink-2">Your record against and with the people you play with. Confirmed games only.</p>
        <button className="btn-ball" onClick={() => { setAdding(true); setMsg(null); }}>Add a friend</button>
      </div>

      {rows.length === 0 ? <div className="mt-4"><Empty title="No friends yet" body="Add the people you run with to see your head-to-head records." /></div> : (
        <ul className="mt-4">
          {rows.map(({ p, h }) => {
            const played = h.vsW + h.vsL;
            return (
              <li key={p.id} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-t border-ink/10 py-3">
                <Avatar config={p.character} size={44} />
                <div className="min-w-0">
                  <div className="font-bold">{p.nickname}</div>
                  <div className="truncate text-sm text-ink-2">{archetypeName(p.dna, p.position)}{h.withW + h.withL ? `. Together: ${h.withW}–${h.withL}` : ""}</div>
                </div>
                <div className="text-right">
                  {played ? (
                    <>
                      <div className="score text-[38px]"><span className={h.vsW >= h.vsL ? "text-emerald" : ""}>{h.vsW}</span><span className="text-ink-3">–</span><span className={h.vsL > h.vsW ? "text-warn" : ""}>{h.vsL}</span></div>
                      <div className="text-xs text-ink-2">vs {p.nickname}</div>
                    </>
                  ) : <span className="text-sm text-ink-2">No games against yet</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-night/60 sm:place-items-center sm:p-6" onClick={() => setAdding(false)}>
          <div className="rise max-h-[92vh] w-full max-w-md overflow-auto rounded-t-[28px] bg-paper p-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add a friend">
            <h2 className="display text-[2.2rem]">Add a friend</h2>
            <div className="mt-4 flex items-center gap-4 rounded-2xl bg-white p-4">
              <Qr value={friendLink(state.meId, origin)} size={112} />
              <div>
                <div className="text-sm text-ink-2">Your friend code</div>
                <div className="num text-[40px] leading-none tracking-wide">{myCode}</div>
                <div className="mt-1 text-sm text-ink-2">They scan this with their camera, or type the code.</div>
              </div>
            </div>
            <form className="mt-5" onSubmit={(e) => { e.preventDefault(); addByCode(code); }}>
              <label className="label" htmlFor="fc">Their code</label>
              <div className="flex gap-2">
                <input id="fc" className="field num text-xl uppercase tracking-widest" placeholder="ABC-123" value={code} onChange={(e) => setCode(e.target.value)} maxLength={8} />
                <button className="btn-ink shrink-0">Add</button>
              </div>
            </form>
            <div className="mt-5 grid gap-2">
              {contactsSupported && <button className="btn-line" onClick={pickContacts}>Invite from my contacts</button>}
              <button className="btn-line" onClick={invite}>Send an invite link</button>
            </div>
            {invited.length > 0 && <p className="mt-2 text-sm text-ink-2">Invited {invited.join(", ")}. They show up here once they join and accept.</p>}
            {msg && <p className="mt-3 text-[15px] font-semibold" role="status">{msg}</p>}
            <p className="mt-4 text-xs text-ink-2">ruNit never uploads your contact list. You choose who gets an invite. Demo codes to try: {["p-tasha", "p-chris", "p-andre"].map((id) => `${player(id)?.nickname} ${friendCode(id)}`).join(", ")}.</p>
            <button className="btn-ghost mt-3 px-0" onClick={() => setAdding(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
