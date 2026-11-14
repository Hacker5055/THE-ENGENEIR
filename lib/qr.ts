import QRCode from "qrcode";

/** Renders a compact, high-contrast SVG QR (server-side). */
export async function qrSvg(text: string, opts: { scale?: number; dark?: string } = {}) {
  return QRCode.toString(text, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: opts.dark ?? "#0B1424", light: "#00000000" },
  });
}
