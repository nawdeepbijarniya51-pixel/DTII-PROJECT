import { useState, useRef } from "react";
import { Upload, Image as ImageIcon, Film, Download, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ConfigPanel } from "@/components/ConfigPanel";
import { detectImage, type DetectionResult } from "@/lib/api";

interface DetectionTabProps {
  modelReady: boolean;
}

export function DetectionTab({ modelReady }: DetectionTabProps) {
  const [mode, setMode] = useState<"image" | "video">("image");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0.25);
  const [iou, setIou] = useState(0.45);
  const [maxDet, setMaxDet] = useState(50);
  const [videoProgress, setVideoProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);

    if (!modelReady) {
      setError("Please load a model first in the Setup tab");
      return;
    }

    if (mode === "image") {
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file (JPG/PNG)");
        return;
      }
      setPreview(URL.createObjectURL(file));
      setLoading(true);
      try {
        const res = await detectImage(file, confidence, iou, maxDet);
        setResult(res);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    } else {
      setError("Video processing requires the backend. Upload a video and it will be processed frame-by-frame.");
    }
  };

  const downloadResult = () => {
    if (!result) return;
    const link = document.createElement("a");
    link.href = `data:image/jpeg;base64,${result.annotated_image}`;
    link.download = "pothole_detection_result.jpg";
    link.click();
  };

  const getSeverity = (areaPct: number) => {
    if (areaPct < 5) return { label: "Small", color: "text-severity-low" };
    if (areaPct < 15) return { label: "Medium", color: "text-severity-medium" };
    return { label: "Large", color: "text-severity-high" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-lg font-bold text-primary glow-yellow">
          🖼️ Detection
        </h2>
        <div className="flex gap-1 rounded-md border border-border bg-secondary p-0.5">
          {(["image", "video"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setResult(null); setPreview(null); }}
              className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-all ${
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Upload zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-md border-2 border-dashed border-border p-10 text-center transition-all hover:border-primary/50 hover:bg-primary/5"
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Click to upload {mode === "image" ? "an image" : "a video"}
            </p>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept={mode === "image" ? "image/*" : "video/*"}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-card p-8">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="font-mono text-sm text-primary animate-pulse-glow">Analyzing...</span>
              {mode === "video" && <Progress value={videoProgress} className="w-full max-w-xs" />}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div className="relative rounded-md border border-primary/20 overflow-hidden glow-box">
                <img
                  src={`data:image/jpeg;base64,${result.annotated_image}`}
                  alt="Detection result"
                  className="w-full"
                />
                <div className="absolute top-2 left-2 rounded-sm bg-background/80 backdrop-blur-sm px-2 py-1 font-mono text-xs text-primary">
                  {result.pothole_count} pothole{result.pothole_count !== 1 ? "s" : ""} detected
                </div>
              </div>
              <Button
                onClick={downloadResult}
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <Download className="h-4 w-4 mr-2" /> Download Result
              </Button>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <ConfigPanel
            confidence={confidence}
            iou={iou}
            maxDetections={maxDet}
            onConfidenceChange={setConfidence}
            onIouChange={setIou}
            onMaxDetChange={setMaxDet}
          />

          {result && (
            <div className="rounded-md border border-border bg-card p-4 space-y-3">
              <h3 className="font-mono text-xs uppercase tracking-widest text-primary">
                📊 Stats
              </h3>
              <div className="space-y-2">
                {[
                  ["Potholes", result.pothole_count.toString()],
                  ["Avg Confidence", `${(result.avg_confidence * 100).toFixed(1)}%`],
                  ["Mask Area", `${result.total_mask_area_pct.toFixed(1)}%`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="font-mono text-xs text-foreground">{value}</span>
                  </div>
                ))}
              </div>

              {result.detections.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Detections</span>
                  {result.detections.map((d, i) => {
                    const sev = getSeverity(d.area_pct);
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">#{i + 1}</span>
                        <span className="font-mono">{(d.confidence * 100).toFixed(0)}%</span>
                        <span className="font-mono">{d.area_pct.toFixed(1)}%</span>
                        <span className={`font-mono font-bold ${sev.color}`}>{sev.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
