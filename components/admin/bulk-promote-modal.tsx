"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { IconArrowUp, IconArrowBigUpLines } from "@tabler/icons-react";
import { Modal } from "@/components/ui/modal";
import { bulkPromoteMembers, type MemberResult } from "@/lib/actions/member";
import {
  ROLE_PROMOTION_NEXT,
  displayRoleLabel,
  ROLE_DEFAULT_LABELS,
  type Role,
} from "@/lib/roles";
import type { ClubMemberView } from "@/lib/queries/admin-members";

type Group = { role: Role; members: ClubMemberView[] };

/**
 * Cycle-end bulk promotion. Self-contained: renders its own trigger button
 * (gated by `canPromote`) + the modal. The modal is a top-level sibling of the
 * button, never nested inside a parent `<form>` (Lesson 7 / 23).
 *
 * v1: auto-map only. Each selected member is promoted one structural tier via
 * `ROLE_PROMOTION_NEXT`. `overall_coordinator` has no next tier — those rows
 * are shown greyed out and are never selectable. Excluded members are shown
 * but unchecked by default (the lead can still opt them back in).
 */
export function BulkPromoteModal({
  groups,
  clubId,
  clubSlug,
  canPromote,
}: {
  groups: Group[];
  clubId: string;
  clubSlug: string;
  canPromote: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  if (!canPromote) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-cream"
      >
        <IconArrowBigUpLines size={15} /> Promote members
      </button>

      <Modal open={open} onClose={() => setOpen(false)} className="max-w-2xl">
        <PromoteBody
          groups={groups}
          clubId={clubId}
          clubSlug={clubSlug}
          onClose={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

function PromoteBody({
  groups,
  clubId,
  clubSlug,
  onClose,
}: {
  groups: Group[];
  clubId: string;
  clubSlug: string;
  onClose: () => void;
}) {
  // A member is promotable only if it has a next tier (not overall_coordinator).
  const isPromotable = React.useCallback(
    (m: ClubMemberView) => ROLE_PROMOTION_NEXT[m.role] !== null,
    [],
  );

  // Default selection: promotable + not excluded.
  const [selected, setSelected] = React.useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const g of groups) {
      for (const m of g.members) {
        if (isPromotable(m) && !m.exclude_from_promote) s.add(m.profile_id);
      }
    }
    return s;
  });

  const toggle = (profileId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  };

  // Build the payload from the current selection. Filter defensively — a
  // selected id must still resolve to a member with a valid next tier.
  const memberById = React.useMemo(() => {
    const map = new Map<string, ClubMemberView>();
    for (const g of groups) for (const m of g.members) map.set(m.profile_id, m);
    return map;
  }, [groups]);

  const selections = React.useMemo(() => {
    const out: { profileId: string; newRole: Role }[] = [];
    for (const id of selected) {
      const m = memberById.get(id);
      if (!m) continue;
      const next = ROLE_PROMOTION_NEXT[m.role];
      if (next) out.push({ profileId: id, newRole: next });
    }
    return out;
  }, [selected, memberById]);

  const [state, formAction] = useActionState<MemberResult, FormData>(
    bulkPromoteMembers,
    {},
  );

  React.useEffect(() => {
    if (state.ok) {
      onClose();
      window.location.reload();
    }
  }, [state.ok, onClose]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-ink">
          Promote members — end of cycle
        </h3>
        <p className="mt-1 text-xs text-ink-soft">
          Each selected member moves up one tier. Overall Coordinators are at
          the top and can&apos;t be promoted. Custom labels are cleared on
          promotion.
        </p>
      </div>

      <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
        {groups.map((g) => (
          <section key={g.role}>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              {ROLE_DEFAULT_LABELS[g.role]} ({g.members.length})
            </h4>
            <ul className="space-y-1.5">
              {g.members.map((m) => {
                const next = ROLE_PROMOTION_NEXT[m.role];
                const promotable = next !== null;
                const checked = selected.has(m.profile_id);
                return (
                  <li
                    key={m.profile_id}
                    className={`flex items-center gap-3 rounded-xl border border-line p-2.5 ${
                      promotable ? "bg-white" : "bg-cream/40 opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={promotable && checked}
                      disabled={!promotable}
                      onChange={() => toggle(m.profile_id)}
                      className="h-4 w-4 flex-shrink-0 accent-indigo disabled:cursor-not-allowed"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-ink">
                        {m.profile?.full_name ?? "—"}
                      </div>
                      <div className="text-[11px] text-ink-soft">
                        {m.profile?.roll_number ?? "—"}
                        {m.exclude_from_promote && " · Locked"}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5 text-[11px]">
                      <span className="text-ink-soft">
                        {displayRoleLabel(m.role, m.role_label)}
                      </span>
                      {promotable ? (
                        <>
                          <IconArrowUp size={12} className="text-indigo" />
                          <span className="font-medium text-indigo">
                            {ROLE_DEFAULT_LABELS[next]}
                          </span>
                        </>
                      ) : (
                        <span className="text-ink-soft">— top tier</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {state.error && <p className="text-xs text-clay">{state.error}</p>}

      {/* Submit form — hidden inputs carry the derived selection payload. */}
      <form action={formAction} className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="__club_slug" value={clubSlug} />
        <input
          type="hidden"
          name="selections"
          value={JSON.stringify(selections)}
        />

        <p className="text-sm text-ink-soft">
          <span className="font-semibold text-ink">{selections.length}</span>{" "}
          member{selections.length === 1 ? "" : "s"} will be promoted.
        </p>

        <div className="flex gap-2">
          <ConfirmBtn disabled={selections.length === 0} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-cream"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center gap-1.5 rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <IconArrowBigUpLines size={14} />{" "}
      {pending ? "Promoting…" : "Confirm promotion"}
    </button>
  );
}
