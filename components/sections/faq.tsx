import { IconPlus } from "@tabler/icons-react";
import type { Faq } from "@/lib/database.types";

/**
 * Section 9 — FAQ accordion. Native <details>/<summary> = zero JS, accessible
 * by default. The plus icon rotates to an x via the [open] state.
 * Reused on the /faq page later.
 */
export function Faqs({ faqs }: { faqs: Faq[] }) {
  return (
    <section className="bg-beige px-6 py-12">
      <div className="mb-7 text-center">
        <h2 className="text-[27px] font-extrabold tracking-tight text-ink">
          Frequently asked
        </h2>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          Everything a newcomer needs to know
        </p>
      </div>

      <div className="mx-auto max-w-xl space-y-2">
        {faqs.map((f) => (
          <details
            key={f.id}
            className="group overflow-hidden rounded-xl border border-line bg-white"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-[13px] font-medium text-ink [&::-webkit-details-marker]:hidden">
              {f.question}
              <IconPlus
                size={16}
                className="text-clay transition-transform duration-200 group-open:rotate-45"
              />
            </summary>
            <div className="px-4 pb-4 text-xs leading-relaxed text-ink-soft">
              {f.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
