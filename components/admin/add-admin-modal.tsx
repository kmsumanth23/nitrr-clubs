"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "@/components/ui/modal";
import {
  addClubAdmin,
  type AdminActionResult,
} from "@/lib/actions/club-admin";
import { ProfileSearch } from "@/components/admin/profile-search";
import type { ProfileSearchResult } from "@/lib/queries/profile-search";

export function AddAdminModal({
  clubId,
  clubSlug,
}: {
  clubId: string;
  clubSlug: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ProfileSearchResult | null>(
    null,
  );
  const [tier, setTier] = React.useState<"lead" | "manager" | "editor">(
    "editor",
  );
  const [state, formAction] = useActionState<AdminActionResult, FormData>(
    addClubAdmin,
    {},
  );

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setSelected(null);
      setTier("editor");
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
        Add admin
      </button>

      <Modal open={open} onClose={close}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clubId" value={clubId} />
          <input type="hidden" name="__club_slug" value={clubSlug} />
          <input
            type="hidden"
            name="profileId"
            value={selected?.id ?? ""}
          />
          <input type="hidden" name="tier" value={tier} />

          <h3 className="font-display text-lg font-bold text-ink">
            Add a club admin
          </h3>
          <p className="text-xs text-ink-soft">
            Search for a profile, choose their tier, and confirm. They&apos;ll
            be notified through the audit log.
          </p>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Find someone
            </label>
            <ProfileSearch
              excludeClubId={clubId}
              selected={selected}
              onSelect={setSelected}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Tier
            </label>
            <select
              value={tier}
              onChange={(e) =>
                setTier(e.target.value as "lead" | "manager" | "editor")
              }
              className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
            >
              <option value="editor">Editor — content only</option>
              <option value="manager">
                Manager — content + events + applications + gallery
              </option>
              <option value="lead">
                Lead — full control + can manage admins
              </option>
            </select>
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
      {pending ? "Adding…" : "Add admin"}
    </button>
  );
}
