"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Loader2 } from "lucide-react";

type Props = {
  /** Called with each captured photo as a JPEG File. */
  onCapture?: (file: File) => void;
};

type Status = "idle" | "opening" | "loading" | "ready" | "error";

type Prediction = {
  bbox: [number, number, number, number];
  class: string;
  score: number;
};

type CocoModel = {
  detect: (input: HTMLVideoElement) => Promise<Prediction[]>;
};

export default function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<CocoModel | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const mountedRef = useRef(true);
  const showBoxesRef = useRef(true);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [showBoxes, setShowBoxes] = useState(true);
  const [aspect, setAspect] = useState("4 / 3");
  const [shots, setShots] = useState<string[]>([]);

  useEffect(() => {
    showBoxesRef.current = showBoxes;
  }, [showBoxes]);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    if (mountedRef.current) setStatus("idle");
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [stop]);

  const start = useCallback(async () => {
    setError("");
    setStatus("opening");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) throw new Error("Camera preview is unavailable");

      video.srcObject = stream;
      await video.play();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      setAspect(`${video.videoWidth} / ${video.videoHeight}`);

      if (!modelRef.current) {
        setStatus("loading");
        await import("@tensorflow/tfjs");
        const cocoSsd = await import("@tensorflow-models/coco-ssd");
        modelRef.current = await cocoSsd.load();
      }
      if (!mountedRef.current || !streamRef.current || !modelRef.current) return;

      setStatus("ready");
      runningRef.current = true;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Camera overlay is unavailable");

      const loop = async () => {
        if (!runningRef.current || !videoRef.current || !modelRef.current) return;
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (showBoxesRef.current && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const predictions = await modelRef.current.detect(video);
          if (!runningRef.current) return;
          context.clearRect(0, 0, canvas.width, canvas.height);

          for (const prediction of predictions) {
            const [x, y, width, height] = prediction.bbox;
            const label = `${prediction.class} ${Math.round(prediction.score * 100)}%`;
            context.strokeStyle = "#ef4444";
            context.lineWidth = 3;
            context.strokeRect(x, y, width, height);
            context.font = "16px sans-serif";
            const labelWidth = context.measureText(label).width;
            context.fillStyle = "#ef4444";
            context.fillRect(x, Math.max(0, y - 22), labelWidth + 8, 22);
            context.fillStyle = "#ffffff";
            context.fillText(label, x + 4, Math.max(16, y - 6));
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      void loop();
    } catch (caught) {
      stop();
      if (!mountedRef.current) return;
      const err = caught as DOMException;
      setError(
        err.name === "NotAllowedError"
          ? "Camera access was blocked. Allow it in your browser settings and try again."
          : err.name === "NotFoundError"
            ? "No camera was found on this device."
            : `Could not start the camera: ${err.message || "unknown error"}`,
      );
      setStatus("error");
    }
  }, [stop]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const snapshot = document.createElement("canvas");
    snapshot.width = video.videoWidth;
    snapshot.height = video.videoHeight;
    snapshot.getContext("2d")?.drawImage(video, 0, 0);

    snapshot.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const url = URL.createObjectURL(blob);
        setShots((previous) => [...previous, url]);
        onCapture?.(file);
      },
      "image/jpeg",
      0.9,
    );
  }, [onCapture]);

  const shotsRef = useRef<string[]>([]);
  useEffect(() => {
    shotsRef.current = shots;
  }, [shots]);
  useEffect(() => {
    return () => shotsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const active = status === "opening" || status === "loading" || status === "ready";
  const statusText: Record<Status, string> = {
    idle: "Camera is off.",
    opening: "Opening camera...",
    loading: "Loading live product detection...",
    ready: "Camera ready. Labels are shown live.",
    error,
  };

  return (
    <div className="mt-6 w-full space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className="relative w-full overflow-hidden rounded-xl bg-slate-950"
        style={{ aspectRatio: aspect }}
      >
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
            Camera preview
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!active ? (
          <button type="button" onClick={start} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            <Camera className="h-4 w-4" />
            Start camera
          </button>
        ) : (
          <>
            <button type="button" onClick={capture} disabled={status !== "ready"} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              <Camera className="h-4 w-4" />
              Capture photo
            </button>
            <button type="button" onClick={stop} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <CameraOff className="h-4 w-4" />
              Stop camera
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={showBoxes} onChange={(event) => setShowBoxes(event.target.checked)} />
              Show live labels
            </label>
          </>
        )}
      </div>

      <p className={`text-sm ${status === "error" ? "text-red-600" : "text-slate-600"}`} role="status">
        {status === "loading" && <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />}
        {statusText[status]}
      </p>
      <p className="text-xs text-slate-500">
        Live labels are a camera preview only. Captured photos follow the normal evidence analysis flow.
      </p>

      {shots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {shots.map((src, index) => (
            <img key={src} src={src} alt={`Captured photo ${index + 1}`} className="h-16 w-16 rounded-lg object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}
