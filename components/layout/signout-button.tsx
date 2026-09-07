"use client";

import * as React from "react";
import { IconLogout } from "@tabler/icons-react";
import { Modal } from "@/components/ui/modal";

/**
 * Sign-out affordance with confirmation gate.
 *
 * Renders as a button styled like the old <a href="/auth/signout"> anchor.
 * Click → opens confirmation modal.
 * Confirm → submits form POST to /auth/signout (CSRF-protected).
 *
 * Form submission is used instead of fetch() so:
 *  - Origin header is included automatically by the browser
 *  - Works without JavaScript if the modal somehow renders unavailable
 *  - No custom CSRF token infrastructure needed
 */
export function SignoutButton({
  onCloseMenu,
}: {
  onCloseMenu?: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  // NOTE: do NOT call onCloseMenu here. This button is rendered inside the
  // account menu dropdown which is conditionally mounted on menuOpen. Closing
  // the menu now would unmount SignoutButton before the modal render commits,
  // destroying the `open` state — modal never appears, click looks dead.
  // Instead, close the menu only when the modal is dismissed (Cancel /
  // outside-click). On Confirm the browser navigates away, so menu state is
  // moot.
  function handleClick() {
    setOpen(true);
  }

  function handleModalClose() {
    setOpen(false);
    onCloseMenu?.();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-left text-sm text-clay hover:bg-cream"
      >
        <IconLogout size={16} /> Sign out
      </button>

      <Modal open={open} onClose={handleModalClose} className="max-w-xs">
        <form action="/auth/signout" method="POST" className="space-y-4">
          <h3 className="font-display text-lg font-bold text-ink">
            Are you sure you want to sign out?
          </h3>

          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-clay px-4 py-2.5 text-sm font-medium text-white hover:bg-clay/90"
            >
              <IconLogout size={13} />
              Sign out
            </button>
            <button
              type="button"
              onClick={handleModalClose}
              className="inline-flex items-center justify-center rounded-full border border-line px-4 py-2.5 text-sm text-ink hover:bg-cream"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
