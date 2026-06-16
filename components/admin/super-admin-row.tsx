"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "@/components/ui/modal";
import {
  setSuperAdmin,
  type SysadminResult,
} from "@/lib/actions/sysadmin";
import type { SuperAdminProfile } from "@/lib/queries/sysadmin";

export function SuperAdminRow({
  profile,
  currentUserId,
  totalCount,
}: {
  profile: SuperAdminProfile;
  currentUserId: string;
  totalCount: number;
}) {
  const [open, setOpen] = React.useState(false);
  const isSelf = profile.id === currentUserId;
  const isLast = totalCount <= 1;
  const cantDemote = isSelf && isLast;

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">
            {profile.full_name ?? "—"}
          </span>
          {isSelf && (
            <span className="rounded-full bg-beige px-1.5 py-0.5 text-[10px] text-ink-soft">
              You
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-ink-soft">
          {profile.email}
          {profile.roll_number && <> · {profile.roll_number}</>}
          {profile.year && <> · Year {profile.year}</>}
          {profile.branch && <> · {profile.branch}</>}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={cantDemote}
        title={cantDemote ? "Cannot demote the only sysadmin." : "Demote to student"}
        className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-soft hover:border-clay hover:text-clay disabled:cursor-not-allowed disabled:opacity-50"
      >
        Demote
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <DemoteConfirm
          profile={profile}
          isSelf={isSelf}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </li>
  );
}

function DemoteConfirm({
  profile,
  isSelf,
  onCancel,
}: {
  profile: SuperAdminProfile;
  isSelf: boolean;
  onCancel: () => void;
}) {
  const [state, formAction] = useActionState<SysadminResult, FormData>(
    setSuperAdmin,
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
      <input type="hidden" name="profileId" value={profile.id} />
      <input type="hidden" name="value" value="false" />

      <h3 className="font-display text-lg font-bold text-ink">
        Demote {isSelf ? "yourself" : profile.full_name ?? "this sysadmin"}?
      </h3>
      <p className="text-sm text-ink-soft">
        {isSelf
          ? "You'll lose system-wide access. Any clubs where you're a lead/manager/editor will stay unchanged."
          : "They'll lose system-wide access. Any clubs they manage stay unchanged."}
        {" "}This is reversible — promote again any time.
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
      {pending ? "Demoting…" : "Yes, demote"}
    </button>
  );
}
