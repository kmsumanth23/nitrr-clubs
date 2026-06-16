"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "@/components/ui/modal";
import {
  setSuperAdmin,
  type SysadminResult,
} from "@/lib/actions/sysadmin";
import { ProfileSearch } from "@/components/admin/profile-search";
import type { ProfileSearchResult } from "@/lib/queries/profile-search";

export function PromoteSuperAdminModal() {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ProfileSearchResult | null>(
    null,
  );
  const [state, formAction] = useActionState<SysadminResult, FormData>(
    setSuperAdmin,
    {},
  );

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setSelected(null);
      window.location.reload();
    }
  }, [state.ok]);

  function close() {
    setOpen(false);
    setSelected(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-indigo px-4 py-2 text-sm font-medium text-indigo-fg hover:bg-indigo/90"
      >
        Promote
      </button>

      <Modal open={open} onClose={close}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="value" value="true" />
          <input
            type="hidden"
            name="profileId"
            value={selected?.id ?? ""}
          />

          <h3 className="font-display text-lg font-bold text-ink">
            Promote to sysadmin
          </h3>
          <p className="text-xs text-ink-soft">
            They&apos;ll get system-wide control: create clubs, decommission
            clubs, manage all admins, edit any content. Reversible.
          </p>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Find a profile
            </label>
            <ProfileSearch
              selected={selected}
              onSelect={setSelected}
            />
          </div>

          {state.error && <p className="text-xs text-clay">{state.error}</p>}

          <div className="flex gap-2 pt-2">
            <ConfirmBtn disabled={!selected} />
            <button
              type="button"
              onClick={close}
              className="rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-cream"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function ConfirmBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Promoting…" : "Promote"}
    </button>
  );
}
