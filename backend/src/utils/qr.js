import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";

export async function generateQrDataUrl(payload) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
  });
}

export function generateToken() {
  return uuidv4();
}
