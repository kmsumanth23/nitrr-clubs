"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "@/components/ui/modal";
import { MemberEditModal } from "@/components/admin/member-edit-modal";
import { removeMember, type MemberResult } from "@/lib/actions/member";
import { displayRoleLabel } from "@/lib/roles";
import type { ClubMemberView } from "@/lib/queries/admin-members";
import type { AdminTier } from "@/lib/database.types";

/**
 * One row of the members table. Remove button is shown only to leads (or
 * super_admin); managers see it but disabled. Removing another lead is
 * blocked by both the UI (disabled tooltip) and the SQL function.
 */
export function MemberRow({
  member,
  clubId,
  clubSlug,
  viewerTier,
  viewerIsSuper,
}: {
  member: ClubMemberView;
  clubId: string;
  clubSlug: string;
  viewerTier: AdminTier;
  viewerIsSuper: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  const canRemoveSomeone = viewerTier === "lead" || viewerIsSuper;
  const targetProtected = member.is_lead && !viewerIsSuper;
  const canRemoveThisOne = canRemoveSomeone && !targetProtected;

  // 17B: role edits (and exclude toggle) are lead/sysadmin-only, matching the
  // `update_member_role` RPC gate.
  const canEditRole = viewerTier === "lead" || viewerIsSuper;

  const reason = !canRemoveSomeone
    ? "Only leads can remove members."
    : targetProtected
      ? "You cannot remove another lead."
      : "";

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">
            {member.profile?.full_name ?? "—"}
          </span>
          {member.is_lead && (
            <span className="rounded-full bg-indigo px-2 py-0.5 text-[10px] font-medium text-indigo-fg">
              Lead
            </span>
          )}
        </div>
        {/* 17B: structural role pill + optional "Locked" (excluded) indicator */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-indigo-soft px-2 py-0.5 text-[10px] font-medium text-indigo">
            {displayRoleLabel(member.role, member.role_label)}
          </span>
          {member.exclude_from_promote && (
            <span
              className="rounded-full bg-cream px-2 py-0.5 text-[10px] text-ink-soft"
              title="Excluded from bulk promotion"
            >
              Locked
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-ink-soft">
          {member.profile?.roll_number ?? "—"}
          {member.profile?.year && <> · Year {member.profile.year}</>}
          {member.profile?.branch && <> · {member.profile.branch}</>}
        </div>
        <div className="mt-0.5 text-[11px] text-ink-soft">
          Joined {new Date(member.joined_at).toLocaleDateString("en-IN")}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {canEditRole && (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            title="Edit role"
            className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-soft hover:border-ink/40"
          >
            Edit role
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!canRemoveThisOne}
          title={reason || "Remove from club"}
          className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-soft hover:border-clay hover:text-clay disabled:cursor-not-allowed disabled:opacity-50"
        >
          Remove
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        <RemoveConfirm
          member={member}
          clubId={clubId}
          clubSlug={clubSlug}
          onCancel={() => setOpen(false)}
        />
      </Modal>

      {/* 17B: role edit modal — top-level sibling, not nested in any form. */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <MemberEditModal
          member={member}
          clubId={clubId}
          clubSlug={clubSlug}
          onClose={() => setEditOpen(false)}
        />
      </Modal>
    </li>
  );
}

function RemoveConfirm({
  member,
  clubId,
  clubSlug,
  onCancel,
}: {
  member: ClubMemberView;
  clubId: string;
  clubSlug: string;
  onCancel: () => void;
}) {
  const [state, formAction] = useActionState<MemberResult, FormData>(
    removeMember,
    {},
  );

  React.useEffect(() => {
    if (state.ok) {
      onCancel();
      window.location.reload();
    }
  }, [state.ok, onCancel]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="profileId" value={member.profile_id} />
      <input type="hidden" name="__club_slug" value={clubSlug} />

      <h3 className="font-display text-lg font-bold text-ink">
        Remove {member.profile?.full_name ?? "this member"}?
      </h3>
      <p className="text-sm text-ink-soft">
        They&apos;ll be removed from the club&apos;s roster. Their application
        history is preserved with status &quot;removed.&quot; They can re-apply
        in a future recruitment.
      </p>

      {state.error && <p className="text-xs text-clay">{state.error}</p>}

      <div className="flex gap-2">
        <ConfirmBtn />
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-cream"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ConfirmBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-clay px-6 py-2.5 text-sm font-medium text-clay-fg hover:bg-clay/90 disabled:opacity-60"
    >
      {pending ? "Removing…" : "Yes, remove"}
    </button>
  );
}
