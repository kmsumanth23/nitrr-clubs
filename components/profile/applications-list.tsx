"use client";

import * as React from "react";
import Link from "next/link";
import { IconChevronDown } from "@tabler/icons-react";
import { ApplicationRow } from "@/components/profile/application-row";
import type { MyApplication } from "@/lib/queries/profile";

/**
 * Two-section list: Active above, History (collapsed) below.
 * Partition rule lives in queries/profile.ts; this component just renders.
 */
export function ApplicationsList({
  active,
  history,
}: {
  active: MyApplication[];
  history: MyApplication[];
}) {
  const [historyOpen, setHistoryOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <section>
        {active.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
            No active applications.{" "}
            <Link href="/clubs" className="font-medium text-indigo hover:underline">
              Browse clubs to apply
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-2">
            {active.map((app) => (
              <ApplicationRow key={app.id} app={app} />
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="mb-3 flex w-full items-center justify-between text-sm font-bold uppercase tracking-wide text-ink-soft hover:text-ink"
          >
            <span>
              History{" "}
              <span className="ml-1 rounded-full bg-beige px-2 py-0.5 text-[10px] normal-case tracking-normal text-ink-soft">
                {history.length}
              </span>
            </span>
            <IconChevronDown
              size={16}
              className={`transition-transform ${
                historyOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {historyOpen && (
            <ul className="space-y-2">
              {history.map((app) => (
                <ApplicationRow key={app.id} app={app} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}