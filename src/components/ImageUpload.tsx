import * as React from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { uploadMenuImage, deleteMenuImageByUrl } from "@/lib/storage";
import { fileToDataUrl, getCroppedBlob } from "@/lib/crop";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";

interface Props {
  restaurantId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  aspect?: number;
  label?: string;
}

export function ImageUpload({ restaurantId, value, onChange, aspect = 1, label = "Image" }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [src, setSrc] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [area, setArea] = React.useState<Area | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Max 10MB");
      return;
    }
    setSrc(await fileToDataUrl(f));
    e.target.value = "";
  };

  const onConfirm = async () => {
    if (!src || !area) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(src, area);
      const url = await uploadMenuImage(restaurantId, blob, "jpg");
      if (value) await deleteMenuImageByUrl(value).catch(() => {});
      onChange(url);
      setSrc(null);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onRemove = async () => {
    if (!value) return;
    await deleteMenuImageByUrl(value).catch(() => {});
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-start gap-3">
        {value ? (
          <div className="relative h-24 w-24 overflow-hidden rounded-md border">
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={onRemove}
              className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 hover:bg-background"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed text-muted-foreground">
            <Upload className="h-5 w-5" />
          </div>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          {value ? "Change" : "Upload"}
        </Button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>

      <Dialog open={!!src} onOpenChange={(o) => !o && setSrc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop image</DialogTitle>
          </DialogHeader>
          <div className="relative h-72 w-full bg-muted">
            {src && (
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, a) => setArea(a)}
              />
            )}
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Zoom</div>
            <Slider value={[zoom]} min={1} max={3} step={0.05} onValueChange={(v) => setZoom(v[0])} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSrc(null)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={uploading}>
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
