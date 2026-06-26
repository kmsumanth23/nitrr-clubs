"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { FaqRow } from "@/components/admin/faq-row";
import { FaqFormModal } from "@/components/admin/faq-form-modal";
import type { Faq } from "@/lib/database.types";

export function FaqList({ faqs }: { faqs: Faq[] }) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  // Bump key on close → modal re-mounts with fresh useActionState on next open
  const [modalKey, setModalKey] = React.useState(0);

  // Stable callback prevents an infinite-loop in the form modal's useEffect
  // (which depends on this ref). Without useCallback every parent render
  // creates a new function, the effect re-fires while state.ok is still true,
  // → router.refresh() → re-render → new fn → re-fire → loop.
  const handleAddingChange = React.useCallback(
    (next: boolean) => {
      setAdding(next);
      if (!next) {
        setModalKey((k) => k + 1);
        router.refresh();
      }
    },
    [router],
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">
          {faqs.length} FAQ{faqs.length === 1 ? "" : "s"}
          {" · "}
          {faqs.filter((f) => f.is_published).length} published
        </p>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo px-3.5 py-1.5 text-xs text-indigo-fg hover:bg-indigo/90"
        >
          <IconPlus size={13} /> Add FAQ
        </button>
      </div>

      <div className="rounded-2xl border border-line bg-white">
        {faqs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">
            No FAQs yet. Click &ldquo;Add FAQ&rdquo; to create one.
          </p>
        ) : (
          <ul>
            {faqs.map((f, i) => (
              <FaqRow
                key={f.id}
                faq={f}
                index={i}
                isFirst={i === 0}
                isLast={i === faqs.length - 1}
              />
            ))}
          </ul>
        )}
      </div>

      <FaqFormModal
        key={modalKey}
        open={adding}
        onOpenChange={handleAddingChange}
      />
    </>
  );
}
