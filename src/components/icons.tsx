import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p,
});

export const I = {
  Pin: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>),
  Clock: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>),
  Users: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="9" cy="8.5" r="3.2"/><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><path d="M16 5.6a3 3 0 0 1 0 5.8M18 14.4c1.6.7 2.7 2.3 3 4.6"/></svg>),
  Plus: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 5v14M5 12h14"/></svg>),
  Check: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m5 12.5 4.2 4L19 7"/></svg>),
  X: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M6 6l12 12M18 6 6 18"/></svg>),
  Chevron: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m9 6 6 6-6 6"/></svg>),
  Back: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m15 6-6 6 6 6"/></svg>),
  Bell: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>),
  Bulb: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M9 17h6M10 20.5h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V17h5.2v-1.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"/></svg>),
  Shield: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>),
  Bolt: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z"/></svg>),
  Home: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/></svg>),
  Map: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z"/><path d="M9 4v14M15 6v14"/></svg>),
  Ball: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5v17M6 6c2.6 2.4 2.6 9.6 0 12M18 6c-2.6 2.4-2.6 9.6 0 12"/></svg>),
  Door: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M14 4H6v16h8"/><path d="M14 4l5 2v12l-5 2V4Z"/><circle cx="16.5" cy="12" r=".6" fill="currentColor"/></svg>),
  Qr: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/></svg>),
  Flag: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>),
  Spark: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>),
  Trophy: (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5a3 3 0 0 0 3 3.5M16 6h3a3 3 0 0 1-3 3.5M12 13v4M8.5 20h7"/></svg>),
};
