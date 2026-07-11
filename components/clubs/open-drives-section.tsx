import Link from "next/link";
import {
  IconCalendar,
  IconArrowRight,
  IconLock,
  IconCheck,
  IconUser,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/server";
import { getOpenDrivesForClub } from "@/lib/queries/apply";
import { targetYearsLabel } from "@/lib/drive-format";

/**
 * "Open drives" section on the public club detail page.
 * Server component — fetches drives + optional signed-in-user context.
 * Hides itself entirely if no open drives exist.
 */
export async function OpenDrivesSection({
  clubId,
  clubSlug,
}: {
  clubId: string;
  clubSlug: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let studentId: string | null = null;
  let studentYear: number | null = null;
  if (user) {
    studentId = user.id;
    const { data } = await supabase
      .from("profiles")
      .select("year")
      .eq("id", user.id)
      .maybeSingle();
    studentYear = data?.year ?? null;
  }

  const drives = await getOpenDrivesForClub(clubId, studentId, studentYear);
  if (drives.length === 0) return null;

  return (
    <section className="border-t border-line py-10">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-ink">Open drives</h2>
        <span className="text-xs text-ink-soft">
          {drives.length} {drives.length === 1 ? "drive" : "drives"} accepting
          applications
        </span>
      </div>
      <div className="space-y-3">
        {drives.map((d) => (
          <DriveCard
            key={d.id}
            drive={d}
            clubSlug={clubSlug}
            signedIn={!!user}
            hasProfileYear={studentYear !== null}
          />
        ))}
      </div>
    </section>
  );
}

interface DriveWithState {
  id: string;
  name: string;
  description: string | null;
  target_years: number[];
  deadline: string | null;
  eligible: boolean;
  has_applied: boolean;
  application_status: string | null;
}

function DriveCard({
  drive,
  clubSlug,
  signedIn,
  hasProfileYear,
}: {
  drive: DriveWithState;
  clubSlug: string;
  signedIn: boolean;
  hasProfileYear: boolean;
}) {
  const dimmed = signedIn && hasProfileYear && !drive.eligible;

  const applyHref = `/clubs/${clubSlug}/apply/${drive.id}`;

  return (
    <div
      className={
        "rounded-2xl border p-5 transition-colors " +
        (dimmed
          ? "border-line bg-cream/40 opacity-70"
          : "border-line bg-white hover:border-ink/20")
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold text-ink">
            {drive.name}
          </h3>
          {drive.description && (
            <p className="mt-1 text-sm text-ink-soft">{drive.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="rounded-full bg-beige px-2 py-0.5 text-ink-soft">
              For {targetYearsLabel(drive.target_years)}
            </span>
            {drive.deadline && (
              <span className="inline-flex items-center gap-1 text-ink-soft">
                <IconCalendar size={11} /> Closes{" "}
                {formatDeadline(drive.deadline)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center">
          <ActionCTA
            drive={drive}
            applyHref={applyHref}
            signedIn={signedIn}
            hasProfileYear={hasProfileYear}
          />
        </div>
      </div>

      {dimmed && (
        <p className="mt-3 text-[11px] text-ink-soft">
          For Year {drive.target_years.join(", ")} students only.
        </p>
      )}
    </div>
  );
}

function ActionCTA({
  drive,
  applyHref,
  signedIn,
  hasProfileYear,
}: {
  drive: DriveWithState;
  applyHref: string;
  signedIn: boolean;
  hasProfileYear: boolean;
}) {
  // Already applied
  if (drive.has_applied) {
    return (
      <Link
        href={applyHref}
        className="inline-flex items-center gap-1 rounded-full border border-indigo bg-indigo/5 px-3 py-1.5 text-xs font-medium text-indigo hover:bg-indigo/10"
      >
        <IconCheck size={12} /> Applied
      </Link>
    );
  }

  // Not signed in — deep-link to sign-in with a next to come back here
  if (!signedIn) {
    return (
      <Link
        href={`/?signin=1&next=${encodeURIComponent(applyHref)}`}
        className="inline-flex items-center gap-1 rounded-full bg-indigo px-4 py-2 text-sm text-indigo-fg hover:bg-indigo/90"
      >
        Sign in to apply <IconArrowRight size={12} />
      </Link>
    );
  }

  // Signed in, no profile year yet
  if (!hasProfileYear) {
    return (
      <Link
        href={`/profile/complete?next=${encodeURIComponent(applyHref)}`}
        className="inline-flex items-center gap-1 rounded-full border border-line px-4 py-2 text-xs text-ink-soft hover:bg-cream"
      >
        <IconUser size={11} /> Complete profile
      </Link>
    );
  }

  // Signed in, not eligible
  if (!drive.eligible) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-cream px-3 py-1.5 text-xs text-ink-soft">
        <IconLock size={11} /> Not eligible
      </span>
    );
  }

  // Signed in, eligible, hasn't applied — happy path
  return (
    <Link
      href={applyHref}
      className="inline-flex items-center gap-1 rounded-full bg-indigo px-4 py-2 text-sm text-indigo-fg hover:bg-indigo/90"
    >
      Apply <IconArrowRight size={12} />
    </Link>
  );
}

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
