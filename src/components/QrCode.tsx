import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Renders a real, scannable QR code for the given payload (generated locally, no external service). */
export default function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { width: size, margin: 1 }).then((url) => alive && setSrc(url)).catch(() => alive && setSrc(''));
    return () => { alive = false; };
  }, [value, size]);
  if (!src) return <div style={{ width: size, height: size }} className="animate-pulse rounded-lg bg-slate-100" />;
  return <img src={src} width={size} height={size} alt={`QR code ${value}`} className="rounded-lg border border-slate-200" />;
}
