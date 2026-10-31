"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function Qr({ value, size = 148 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState<string>("");
  useEffect(() => {
    QRCode.toString(value, { type: "svg", margin: 0, color: { dark: "#202B30", light: "#FFF9F0" } }).then(setSvg).catch(() => setSvg(""));
  }, [value]);
  return <div style={{ width: size, height: size }} className="[&>svg]:h-full [&>svg]:w-full" aria-label={`QR code for game ${value}`} role="img" dangerouslySetInnerHTML={{ __html: svg }} />;
}
