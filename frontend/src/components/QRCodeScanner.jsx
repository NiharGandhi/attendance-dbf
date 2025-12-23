import { useEffect, useRef, useState } from "react";

export default function QRCodeScanner({ onScan }) {
  const videoRef = useRef(null);
  const onScanRef = useRef(onScan);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

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
        const video = videoRef.current;
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            onScanRef.current?.(barcodes[0].rawValue);
          }
        } catch (error) {
          console.error("QR detection failed", error);
        }
      }, 1000);
    }

    start().catch(() => setStatus("error"));

    return () => {
      if (interval) clearInterval(interval);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

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
