import { IconArchive } from "@tabler/icons-react";

/** Small pill indicating a club is decommissioned. Reused across admin and
 *  profile surfaces. Pass `archivedAt` to include the date. */
export function DecommissionedBadge({
  archivedAt,
  compact = false,
}: {
  archivedAt: string | null | undefined;
  compact?: boolean;
}) {
  if (!archivedAt) return null;
  const date = new Date(archivedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-clay/10 px-2 py-0.5 text-[11px] font-medium text-clay">
        <IconArchive size={10} /> Decommissioned
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-clay/10 px-2 py-0.5 text-[11px] font-medium text-clay">
      <IconArchive size={10} /> Decommissioned · {date}
    </span>
  );
}
