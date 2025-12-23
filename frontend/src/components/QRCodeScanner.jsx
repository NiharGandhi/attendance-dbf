import { useEffect, useRef, useState } from "react";

export default function QRCodeScanner({ onScan }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    let stream;
    let detector;
    let interval;

    async function start() {
      if (!("BarcodeDetector" in window)) {
        setStatus("unsupported");
        return;
      }
      detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      setStatus("starting");
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("scanning");
      interval = setInterval(async () => {
        if (!videoRef.current) return;
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          onScan(barcodes[0].rawValue);
        }
      }, 1000);
    }

    start().catch(() => setStatus("error"));

    return () => {
      if (interval) clearInterval(interval);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [onScan]);

  if (status === "unsupported") {
    return <p className="muted">Camera scanning not supported on this device.</p>;
  }

  if (status === "error") {
    return <p className="muted">Unable to access camera. Please allow permissions.</p>;
  }

  return (
    <div className="scanner">
      <video ref={videoRef} className="scanner-video" />
      <p className="muted">Point the camera at the session QR code.</p>
    </div>
  );
}
