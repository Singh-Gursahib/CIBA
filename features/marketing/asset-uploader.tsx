"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const MAX_FILES = 6;
const MAX_EDGE = 2048;

/** Downscale oversized images client-side so API payloads stay small. */
async function normalizeImage(file: File): Promise<File> {
  if (file.size < 2_500_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function AssetUploader({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const addFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const images = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
      const normalized = await Promise.all(images.map(normalizeImage));
      onChange([...files, ...normalized].slice(0, MAX_FILES));
    },
    [files, onChange]
  );

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed",
          "px-6 py-8 text-center transition-colors duration-150 cursor-pointer",
          dragOver
            ? "border-river bg-river-tint"
            : "border-line-strong bg-surface hover:border-ink-faint",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <div className="flex size-9 items-center justify-center rounded-full bg-river-tint text-river">
          <ImagePlus className="size-4.5" strokeWidth={1.75} />
        </div>
        <p className="text-sm font-medium text-ink">Drop images here or click to browse</p>
        <p className="text-xs text-ink-faint">
          Up to {MAX_FILES} assets · PNG, JPG, or WebP · photos, graphics, speaker headshots
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {files.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previews[i]}
                alt={file.name}
                className="size-16 rounded-md border border-line object-cover"
              />
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 hidden size-5 items-center justify-center rounded-full bg-ink text-white shadow-1 group-hover:flex"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
