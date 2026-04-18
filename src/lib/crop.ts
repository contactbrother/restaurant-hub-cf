import type { Area } from "react-easy-crop";

export async function getCroppedBlob(imageSrc: string, crop: Area, maxSize = 1200): Promise<Blob> {
  const img = await loadImage(imageSrc);
  const scale = Math.min(1, maxSize / Math.max(crop.width, crop.height));
  const w = Math.round(crop.width * scale);
  const h = Math.round(crop.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Blob failed"))), "image/jpeg", 0.9),
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
