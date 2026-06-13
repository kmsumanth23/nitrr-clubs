/**
 * Client-side image resize using a Canvas. Returns a JPEG Blob no wider/
 * taller than `maxDimension` on its long edge. PNG transparency is lost
 * (output is JPEG); fine for photos.
 *
 * Why client-side: Supabase free tier doesn't include image transformations
 * and we don't want to maintain a separate resize Edge Function. Doing the
 * resize before upload also saves bandwidth — a 5MB phone photo becomes
 * ~300KB before it leaves the user's machine.
 *
 * If the input is already within the dimension limits, returns the original
 * blob unchanged (still good to convert if it's PNG → JPEG for size).
 */
export async function resizeImage(
  file: File,
  maxDimension = 1600,
  quality = 0.85,
): Promise<Blob> {
  const bitmap = await loadBitmap(file);
  const { width, height } = bitmap;

  // If the image is already small enough AND already a JPEG, return as-is.
  const isJpeg = file.type === "image/jpeg";
  if (isJpeg && width <= maxDimension && height <= maxDimension) {
    bitmap.close?.();
    return file;
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close?.();

  return await canvasToBlob(canvas, "image/jpeg", quality);
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  // createImageBitmap handles most formats the browser supports natively
  return await createImageBitmap(file);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Canvas toBlob returned null."));
      },
      type,
      quality,
    );
  });
}

/** Validate file before upload. Returns null if OK, error message if not. */
export function validateImageFile(file: File): string | null {
  const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
  if (!ACCEPTED.includes(file.type)) {
    if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
      return `${file.name}: HEIC isn't supported. Please export as JPEG and try again.`;
    }
    return `${file.name}: only JPEG, PNG, and WebP are accepted.`;
  }
  const MAX = 15 * 1024 * 1024; // 15 MB before resize
  if (file.size > MAX) {
    return `${file.name}: too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 15 MB.`;
  }
  return null;
}
