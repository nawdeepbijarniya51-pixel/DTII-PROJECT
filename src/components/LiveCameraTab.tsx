import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CameraOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigPanel } from "@/components/ConfigPanel";
import { createLiveSocket } from "@/lib/api";

interface LiveCameraTabProps {
  modelReady: boolean;
}

export function LiveCameraTab({ modelReady }: LiveCameraTabProps) {
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [potholeCount, setPotholeCount] = useState(0);
  const [avgConf, setAvgConf] = useState(0);
  const [confidence, setConfidence] = useState(0.25);
  const [iou, setIou] = useState(0.45);
  const [maxDet, setMaxDet] = useState(50);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const sendingRef = useRef(false);
  const intentionalCloseRef = useRef(false);

  const stopStream = useCallback(() => {
    setStreaming(false);
    setError(null);
    intentionalCloseRef.current = true;
    
    // Close WebSocket with proper state check
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
      } catch (e) {
        console.error("Error closing WebSocket:", e);
      }
      wsRef.current = null;
    }
    
    // Stop all media tracks
    streamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch (e) {
        console.error("Error stopping track:", e);
      }
    });
    streamRef.current = null;
    
    // Reset frame timing
    frameTimesRef.current = [];
  }, []);

  const startStream = useCallback(async () => {
    if (!modelReady) {
      setError("Please load a model first");
      return;
    }
    
    // Ensure old stream is fully closed before starting new one
    stopStream();
    setError(null);
    // NOTE: Don't reset intentionalCloseRef yet - let it stay true during cleanup

    // Give WebSocket time to fully close before creating new one
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    // NOW reset the intentional close flag
    intentionalCloseRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const ws = createLiveSocket(confidence, iou);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data.frame) {
            sendingRef.current = false;
            return;
          }
          
          const img = new Image();
          img.onload = () => {
            const canvas = resultCanvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            // Clear canvas with black background
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Calculate scaling to fit image in canvas while preserving aspect ratio
            const canvasAspect = canvas.width / canvas.height;
            const imgAspect = img.width / img.height;

            let scaledWidth = canvas.width;
            let scaledHeight = canvas.height;
            let x = 0;
            let y = 0;

            if (imgAspect > canvasAspect) {
              // Image is wider than canvas
              scaledHeight = canvas.width / imgAspect;
              y = (canvas.height - scaledHeight) / 2;
            } else {
              // Image is taller than canvas
              scaledWidth = canvas.height * imgAspect;
              x = (canvas.width - scaledWidth) / 2;
            }

            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
          };
          img.onerror = () => {
            console.error("Failed to load image from server");
            sendingRef.current = false;
          };
          img.src = `data:image/jpeg;base64,${data.frame}`;
          setPotholeCount(data.pothole_count || 0);
          setAvgConf(data.avg_confidence || 0);

          const now = Date.now();
          frameTimesRef.current.push(now);
          frameTimesRef.current = frameTimesRef.current.filter((t) => now - t < 1000);
          setFps(frameTimesRef.current.length);

          sendingRef.current = false;
        } catch (e) {
          console.error("Error processing message:", e);
          sendingRef.current = false;
        }
      };

      ws.onclose = () => {
        // Only report error if close was NOT intentional
        if (!intentionalCloseRef.current) {
          setError("WebSocket closed unexpectedly. Try starting live detection again.");
        }
        wsRef.current = null;
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket connection failed. Check that backend is running on port 8000.");
        setStreaming(false);
        wsRef.current = null;
      };

      ws.onopen = () => {
        setStreaming(true);
        setError(null);
        const sendFrame = () => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          if (sendingRef.current) {
            requestAnimationFrame(sendFrame);
            return;
          }
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            const base64 = dataUrl.split(",")[1];
            if (base64) {
              wsRef.current?.send(JSON.stringify({ frame: base64 }));
              sendingRef.current = true;
            }
          }
          requestAnimationFrame(sendFrame);
        };
        requestAnimationFrame(sendFrame);
      };
    } catch (e: any) {
      if (e.name === "NotAllowedError") {
        setError("Camera permission denied. Please allow camera access.");
      } else if (e.name === "NotFoundError") {
        setError("No camera found. Check that a camera is connected.");
      } else {
        setError(e.message || "Failed to start camera");
      }
      stopStream();
    }
  }, [modelReady, confidence, iou, stopStream]);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  // Size canvas properly when streaming starts
  useEffect(() => {
    if (!streaming || !resultCanvasRef.current) return;

    const resizeCanvas = () => {
      const canvas = resultCanvasRef.current;
      if (!canvas || !canvas.parentElement) return;

      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [streaming]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-lg font-bold text-primary glow-yellow">
          📷 Live Camera
        </h2>
        <Button
          onClick={streaming ? stopStream : startStream}
          variant={streaming ? "destructive" : "default"}
          className={streaming ? "" : "bg-primary text-primary-foreground hover:bg-primary/90"}
        >
          {streaming ? (
            <><CameraOff className="h-4 w-4 mr-2" /> Stop</>
          ) : (
            <><Camera className="h-4 w-4 mr-2" /> Start Live Detection</>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-md border border-border bg-card overflow-hidden aspect-video">
            {!streaming ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-2">
                  <Camera className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Camera feed will appear here</p>
                </div>
              </div>
            ) : (
              <>
                <canvas
                  ref={resultCanvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ display: "block" }}
                />
                {/* Stats overlay */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {[
                    { label: "FPS", value: fps },
                    { label: "Potholes", value: potholeCount },
                    { label: "Conf", value: `${(avgConf * 100).toFixed(0)}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-sm bg-background/80 backdrop-blur-sm px-2 py-1">
                      <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
                      <p className="font-mono text-xs text-primary font-bold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-sm bg-destructive/80 px-2 py-1">
                  <span className="h-2 w-2 rounded-full bg-foreground animate-pulse-glow" />
                  <span className="font-mono text-[10px] text-foreground uppercase">Live</span>
                </div>
              </>
            )}
          </div>

          {/* Hidden elements for capture */}
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="space-y-4">
          <ConfigPanel
            confidence={confidence}
            iou={iou}
            maxDetections={maxDet}
            onConfidenceChange={setConfidence}
            onIouChange={setIou}
            onMaxDetChange={setMaxDet}
          />
        </div>
      </div>
    </div>
  );
}
