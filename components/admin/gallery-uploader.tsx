"use client";

import * as React from "react";
import { IconUpload, IconAlertCircle } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
import {
  buildPath,
  publicUrl,
  uploadFile,
} from "@/lib/storage/gallery";
import { resizeImage, validateImageFile } from "@/lib/image/resize";
import { createPhotoRow } from "@/lib/actions/gallery";

interface FileProgress {
  id: string; // local-only id
  name: string;
  status: "pending" | "resizing" | "uploading" | "saving" | "done" | "error";
  error?: string;
}

const MAX_CONCURRENT = 3;

export function GalleryUploader({
  clubId,
  clubSlug,
}: {
  clubId: string;
  clubSlug: string;
}) {
  const [progress, setProgress] = React.useState<FileProgress[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const setOne = React.useCallback(
    (id: string, patch: Partial<FileProgress>) => {
      setProgress((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      );
    },
    [],
  );

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    // Pre-validate and seed progress entries
    const entries: FileProgress[] = [];
    const acceptedFiles: { id: string; file: File }[] = [];
    for (const f of list) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const validateErr = validateImageFile(f);
      if (validateErr) {
        entries.push({ id, name: f.name, status: "error", error: validateErr });
      } else {
        entries.push({ id, name: f.name, status: "pending" });
        acceptedFiles.push({ id, file: f });
      }
    }
    setProgress((prev) => [...prev, ...entries]);

    // Run uploads with bounded concurrency
    let cursor = 0;
    async function worker() {
      while (cursor < acceptedFiles.length) {
        const i = cursor++;
        const item = acceptedFiles[i];
        await processOne(item.id, item.file);
      }
    }
    const workers = Array(Math.min(MAX_CONCURRENT, acceptedFiles.length))
      .fill(0)
      .map(() => worker());
    await Promise.all(workers);
  }

  async function processOne(id: string, file: File) {
    const supabase = createClient();
    try {
      setOne(id, { status: "resizing" });
      const resized = await resizeImage(file);

      setOne(id, { status: "uploading" });
      const path = buildPath(clubSlug, file.name);
      const up = await uploadFile(supabase, path, resized, "image/jpeg");
      if (up.error || !up.path) {
        setOne(id, { status: "error", error: up.error ?? "Upload failed." });
        return;
      }

      setOne(id, { status: "saving" });
      const url = publicUrl(supabase, up.path);
      const fd = new FormData();
      fd.set("clubId", clubId);
      fd.set("clubSlug", clubSlug);
      fd.set("path", up.path);
      fd.set("imageUrl", url);
      const res = await createPhotoRow({}, fd);
      if (res.error) {
        setOne(id, { status: "error", error: res.error });
        return;
      }
      setOne(id, { status: "done" });
    } catch (e) {
      setOne(id, {
        status: "error",
        error: e instanceof Error ? e.message : "Failed.",
      });
    }
  }

  // Clear the "done" entries after a short delay so the dropzone clears
  React.useEffect(() => {
    const anyDone = progress.some((p) => p.status === "done");
    if (!anyDone) return;
    const t = setTimeout(() => {
      setProgress((prev) => prev.filter((p) => p.status !== "done"));
      // hard reload to pick up the freshly uploaded photos from the server
      window.location.reload();
    }, 800);
    return () => clearTimeout(t);
  }, [progress]);

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }
  function onDragLeave() {
    setDragOver(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files) void handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors " +
          (dragOver
            ? "border-indigo bg-indigo/5"
            : "border-line bg-white hover:border-ink/30")
        }
      >
        <IconUpload size={28} className="text-ink-soft" />
        <div className="text-sm text-ink">
          Drag photos here or <span className="font-medium text-indigo">click to choose</span>
        </div>
        <div className="text-[11px] text-ink-soft">
          JPEG, PNG, or WebP. Up to 15 MB each.
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {progress.length > 0 && (
        <ul className="space-y-1.5 rounded-2xl border border-line bg-white p-3">
          {progress.map((p) => (
            <li key={p.id} className="flex items-center gap-3 text-xs">
              <span className="flex-1 truncate text-ink">{p.name}</span>
              <span className={statusClasses(p.status)}>
                {statusLabel(p)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusLabel(p: FileProgress): React.ReactNode {
  switch (p.status) {
    case "pending":
      return <span className="text-ink-soft">Queued</span>;
    case "resizing":
      return <span className="text-ink-soft">Resizing…</span>;
    case "uploading":
      return <span className="text-indigo">Uploading…</span>;
    case "saving":
      return <span className="text-indigo">Saving…</span>;
    case "done":
      return <span className="text-sport">✓ Done</span>;
    case "error":
      return (
        <span className="flex items-center gap-1 text-clay" title={p.error}>
          <IconAlertCircle size={12} /> {p.error ?? "Failed"}
        </span>
      );
  }
}

function statusClasses(status: FileProgress["status"]) {
  if (status === "error") return "text-clay";
  if (status === "done") return "text-sport";
  return "text-ink-soft";
}
