"use client";

import * as React from "react";
import {
  IconBrandWhatsapp,
  IconExternalLink,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";
import { Modal } from "@/components/ui/modal";

/**
 * Small WhatsApp icon button. Click → modal with two actions:
 *  - Join group (opens link in new tab)
 *  - Copy link (copies to clipboard, brief feedback)
 *
 * Renders nothing if url is null / empty. Used across:
 *   - components/profile/application-row.tsx (interview link)
 *   - app/(student)/profile/page.tsx memberships row (community link)
 *   - app/(marketing)/clubs/[slug]/page.tsx aside (community link)
 */
export function WhatsAppLinkButton({
  url,
  label,
  size = "sm",
}: {
  url: string | null | undefined;
  label: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  if (!url) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable / blocked — fall back to a select-all prompt
      window.prompt("Copy this link:", url as string);
    }
  }

  const sizeClasses =
    size === "md"
      ? "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5"
      : "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className={
          "inline-flex items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366] transition-colors hover:bg-[#25D366]/20 " +
          sizeClasses
        }
      >
        <IconBrandWhatsapp />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} className="max-w-xs">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <IconBrandWhatsapp size={22} className="text-[#25D366]" />
            <h3 className="font-display text-base font-bold text-ink">
              {label}
            </h3>
          </div>

          <div className="rounded-xl bg-cream/40 p-3">
            <p className="break-all text-[11px] text-ink-soft">{url}</p>
          </div>

          <div className="flex flex-col gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#25D366]/90"
            >
              <IconExternalLink size={14} /> Join group
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-sm text-ink hover:bg-cream"
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
