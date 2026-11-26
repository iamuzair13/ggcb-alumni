"use client";

/** Accessible file drop zone — drag/drop + labelled file button. */
import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DropZone({
  onFile,
  accept,
  maxBytes,
  hint,
  disabled,
}: {
  onFile: (f: File | null, error?: string) => void;
  accept: string; // e.g. ".xlsx,.csv"
  maxBytes: number;
  hint: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function validate(f: File | undefined | null) {
    if (!f) return;
    const okExt = accept
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!okExt) {
      onFile(null, `“${f.name}” is not a supported type — use ${accept}.`);
      return;
    }
    if (f.size > maxBytes) {
      onFile(
        null,
        `“${f.name}” is ${(f.size / 1048576).toFixed(1)} MB — the limit is ${(maxBytes / 1048576).toFixed(0)} MB.`,
      );
      return;
    }
    onFile(f);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        validate(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-input",
        disabled && "opacity-50",
      )}
    >
      <UploadCloud
        className="size-8 text-muted-foreground"
        aria-hidden="true"
      />
      <div>
        <p className="text-sm font-medium">Drop the file here</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label={`File upload — ${hint}`}
        disabled={disabled}
        onChange={(e) => {
          validate(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Choose a file
      </Button>
    </div>
  );
}
