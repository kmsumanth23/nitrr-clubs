"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "@/components/ui/modal";
import {
  removeClubAdmin,
  changeClubAdminTier,
  type AdminActionResult,
} from "@/lib/actions/club-admin";
import type { ClubAdminView, AdminTier } from "@/lib/queries/admin-admins";

export function AdminRow({
  admin,
  clubId,
  clubSlug,
  viewerCanManage,
  isLastLead,
}: {
  admin: ClubAdminView;
  clubId: string;
  clubSlug: string;
  viewerCanManage: boolean;
  isLastLead: boolean;
}) {
  const [removeOpen, setRemoveOpen] = React.useState(false);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">
          {admin.profile?.full_name ?? "—"}
        </div>
        <div className="mt-0.5 text-xs text-ink-soft">
          {admin.profile?.email}
          {admin.profile?.roll_number && <> · {admin.profile.roll_number}</>}
          {admin.profile?.year && <> · Year {admin.profile.year}</>}
          {admin.profile?.branch && <> · {admin.profile.branch}</>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TierControl
          admin={admin}
          clubId={clubId}
          clubSlug={clubSlug}
          viewerCanManage={viewerCanManage}
          isLastLead={isLastLead}
        />
        {viewerCanManage && (
          <button
            type="button"
            onClick={() => setRemoveOpen(true)}
            disabled={isLastLead && admin.tier === "lead"}
            title={
              isLastLead && admin.tier === "lead"
                ? "Cannot remove the only lead. Promote someone else first."
                : "Remove from club admins"
            }
            className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-soft hover:border-clay hover:text-clay disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>

      <Modal open={removeOpen} onClose={() => setRemoveOpen(false)}>
        <RemoveConfirm
          admin={admin}
          clubId={clubId}
          clubSlug={clubSlug}
          onCancel={() => setRemoveOpen(false)}
        />
      </Modal>
    </li>
  );
}

function TierControl({
  admin,
  clubId,
  clubSlug,
  viewerCanManage,
  isLastLead,
}: {
  admin: ClubAdminView;
  clubId: string;
  clubSlug: string;
  viewerCanManage: boolean;
  isLastLead: boolean;
}) {
  const [state, formAction] = useActionState<AdminActionResult, FormData>(
    changeClubAdminTier,
    {},
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  const [tier, setTier] = React.useState<AdminTier>(admin.tier);

  // After server confirmed change, reload
  React.useEffect(() => {
    if (state.ok) window.location.reload();
  }, [state.ok]);

  // Reset local state if server rejected
  React.useEffect(() => {
    if (state.error) setTier(admin.tier);
  }, [state.error, admin.tier]);

  const cantDemoteLastLead = isLastLead && admin.tier === "lead";
  const disabled = !viewerCanManage || cantDemoteLastLead;

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="profileId" value={admin.profile_id} />
      <input type="hidden" name="__club_slug" value={clubSlug} />
      <input type="hidden" name="newTier" value={tier} />
      <select
        value={tier}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value as AdminTier;
          setTier(next);
          // Auto-submit on change
          setTimeout(() => formRef.current?.requestSubmit(), 0);
        }}
        title={
          !viewerCanManage
            ? "Only the lead can change tiers."
            : cantDemoteLastLead
              ? "Cannot demote the only lead. Promote someone else to lead first."
              : ""
        }
        className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-ink-soft outline-none focus:border-indigo disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="editor">Editor</option>
        <option value="manager">Manager</option>
        <option value="lead">Lead</option>
      </select>
      {state.error && (
        <p className="mt-1 text-[10px] text-clay">{state.error}</p>
      )}
    </form>
  );
}

function RemoveConfirm({
  admin,
  clubId,
  clubSlug,
  onCancel,
}: {
  admin: ClubAdminView;
  clubId: string;
  clubSlug: string;
  onCancel: () => void;
}) {
  const [state, formAction] = useActionState<AdminActionResult, FormData>(
    removeClubAdmin,
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
      <input type="hidden" name="profileId" value={admin.profile_id} />
      <input type="hidden" name="__club_slug" value={clubSlug} />

      <h3 className="font-display text-lg font-bold text-ink">
        Remove {admin.profile?.full_name ?? "this admin"}?
      </h3>
      <p className="text-sm text-ink-soft">
        They&apos;ll lose admin access ({admin.tier}). Their club membership
        (if any) stays — only the admin role is removed.
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
