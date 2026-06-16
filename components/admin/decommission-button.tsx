"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "@/components/ui/modal";
import {
  decommissionClub,
  type SysadminResult,
} from "@/lib/actions/sysadmin";

export function DecommissionButton({
  clubId,
  clubName,
}: {
  clubId: string;
  clubName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState<SysadminResult, FormData>(
    decommissionClub,
    {},
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-clay bg-clay-soft px-4 py-2 text-sm font-medium text-clay hover:bg-clay hover:text-clay-fg"
      >
        Decommission this club
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clubId" value={clubId} />

          <h3 className="font-display text-lg font-bold text-ink">
            Decommission {clubName}?
          </h3>
          <p className="text-sm text-ink-soft">
            The club will be hidden from the public site. Its data (members,
            events, gallery, recruitments) is preserved. You can restore it
            anytime from <span className="font-medium">Sysadmin → Archived</span>.
          </p>

          {state.error && <p className="text-xs text-clay">{state.error}</p>}

          <div className="flex gap-2">
            <ConfirmBtn />
            <button
              type="button"
              onClick={() => setOpen(false)}
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

function ConfirmBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-clay px-6 py-2.5 text-sm font-medium text-clay-fg hover:bg-clay/90 disabled:opacity-60"
    >
      {pending ? "Decommissioning…" : "Yes, decommission"}
    </button>
  );
}
