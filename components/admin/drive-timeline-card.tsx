import {
  IconSpeakerphone,
  IconFileText,
  IconTrophy,
} from "@tabler/icons-react";
import type { Phase } from "@/lib/phase";

type TimelinePhase = Extract<Phase, "open" | "review" | "result">;

interface Stage {
  key: TimelinePhase;
  label: string;
  when: string;
  detail: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const STAGES: Stage[] = [
  {
    key: "open",
    label: "Open",
    when: "Accepting applications",
    detail: "Students apply, edit, withdraw.",
    icon: IconSpeakerphone,
  },
  {
    key: "review",
    label: "Review",
    when: "After the deadline",
    detail: "Coordinators accept or reject.",
    icon: IconFileText,
  },
  {
    key: "result",
    label: "Results",
    when: "When the lead publishes",
    detail: "Accepted students become members.",
    icon: IconTrophy,
  },
];

/**
 * 17C Batch 2 addendum: vertical 3-stage timeline shown in the drive editor
 * sidebar. Rendered only when the drive has been published (i.e. phase is
 * open/review/result — never draft).
 *
 * The stage matching `phase` gets the "CURRENT" pill + filled indigo icon
 * chip; past stages get a muted icon chip; future stages get the same muted
 * chip so all three sit on the same visual rail. Order is fixed.
 */
export function DriveTimelineCard({ phase }: { phase: Phase }) {
  if (phase === "draft") return null;
  const current = phase as TimelinePhase;
  const currentIdx = STAGES.findIndex((s) => s.key === current);

  return (
    <aside className="rounded-2xl border border-line bg-white p-5">
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
        Timeline
      </h3>

      <ol className="relative">
        {STAGES.map((stage, idx) => {
          const isCurrent = idx === currentIdx;
          const isPast = idx < currentIdx;
          const isLast = idx === STAGES.length - 1;
          const Icon = stage.icon;
          return (
            <li key={stage.key} className="relative flex gap-3 pb-6 last:pb-0">
              {/* Vertical connector rail — behind the icon chip, stops at the
                  bottom of the last stage's chip. */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-px bg-line"
                />
              )}

              {/* Icon chip */}
              <div
                className={
                  "relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full " +
                  (isCurrent
                    ? "bg-indigo text-indigo-fg"
                    : "border border-line bg-white text-ink-soft")
                }
              >
                <Icon size={18} />
              </div>

              {/* Copy */}
              <div className="min-w-0 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      "font-display text-base font-bold " +
                      (isCurrent
                        ? "text-ink"
                        : isPast
                          ? "text-ink"
                          : "text-ink-soft")
                    }
                  >
                    {stage.label}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-indigo-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-ink-soft">{stage.when}</p>
                <p className="text-sm text-ink-soft">{stage.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
