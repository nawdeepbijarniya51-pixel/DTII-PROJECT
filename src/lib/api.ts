const API_BASE = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL || "http://localhost:8000");

export interface ModelInfo {
  name: string;
  num_classes: number;
  input_size: number;
  classes: string[];
}

export interface Detection {
  confidence: number;
  area_pct: number;
  severity: "small" | "medium" | "large";
}

export interface DetectionResult {
  annotated_image: string; // base64
  detections: Detection[];
  pothole_count: number;
  avg_confidence: number;
  total_mask_area_pct: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  mode: "image" | "video" | "live";
  potholes_found: number;
  avg_confidence: number;
  severity: string;
}

export async function uploadModel(file: File): Promise<ModelInfo> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/upload-model`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getModelInfo(): Promise<ModelInfo | null> {
  const res = await fetch(`${API_BASE}/model-info`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function detectImage(
  file: File,
  conf: number,
  iou: number,
  maxDet: number
): Promise<DetectionResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("conf", conf.toString());
  formData.append("iou", iou.toString());
  formData.append("max_det", maxDet.toString());
  const res = await fetch(`${API_BASE}/detect/image`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function detectVideo(
  file: File,
  conf: number,
  iou: number,
  onProgress?: (pct: number) => void
): Promise<{ video_url: string; stats: Detection[][] }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("conf", conf.toString());
  formData.append("iou", iou.toString());
  const res = await fetch(`${API_BASE}/detect/video`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function createLiveSocket(conf: number, iou: number): WebSocket {
  // In development, use the Vite proxy endpoint `/ws`
  // In production, use the full WebSocket endpoint
  const isDev = import.meta.env.DEV;
  const wsUrl = isDev
    ? new URL("/ws/detect/live", window.location.href)
    : new URL(`/detect/live?conf=${conf}&iou=${iou}`, API_BASE.replace(/^http/, "ws"));
  wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
  return new WebSocket(wsUrl.toString());
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function exportHistoryCSV(entries: HistoryEntry[]): string {
  const header = "Timestamp,Mode,Potholes Found,Avg Confidence,Severity\n";
  const rows = entries.map(
    (e) => `${e.timestamp},${e.mode},${e.potholes_found},${e.avg_confidence.toFixed(2)},${e.severity}`
  );
  return header + rows.join("\n");
}
