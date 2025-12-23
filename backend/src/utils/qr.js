import crypto from "crypto";
import QRCode from "qrcode";
import { getWindowStart, getWindowEnd } from "./time.js";

const SECRET = process.env.QR_SECRET || "local-dev-secret";
const WINDOW_MINUTES = Number.parseInt(process.env.QR_WINDOW_MINUTES || "5", 10);

export function generateToken(sessionId, date = new Date()) {
  const windowStart = getWindowStart(date, WINDOW_MINUTES);
  const windowEnd = getWindowEnd(windowStart, WINDOW_MINUTES);
  const payload = `${sessionId}:${windowStart.toISOString()}`;
  const token = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return { token, validFrom: windowStart, validTo: windowEnd };
}

export function validateToken(sessionId, token, date = new Date()) {
  const { token: expected } = generateToken(sessionId, date);
  const expectedBuffer = Buffer.from(expected, "hex");
  const tokenBuffer = Buffer.from(token || "", "hex");
  if (expectedBuffer.length !== tokenBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, tokenBuffer);
}

export async function generateQrDataUrl(payload) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
  });
}
