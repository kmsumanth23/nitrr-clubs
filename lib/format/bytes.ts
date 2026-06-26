/** Format a byte count as a human-readable string. */
export function formatBytes(bytes: number | bigint): string {
  const n = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (n === 0) return "0 B";
  if (n < 0) return `-${formatBytes(-n)}`;

  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(n) / Math.log(1024)),
    units.length - 1,
  );
  const value = n / Math.pow(1024, i);
  // Show 0 decimals for bytes, 1 for everything else
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Format a Date as "Nm ago", "Nh ago", "Nd ago", or absolute month-day. */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}
