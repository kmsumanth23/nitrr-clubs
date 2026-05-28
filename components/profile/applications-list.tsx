import Link from "next/link";
import { ApplicationRow } from "@/components/profile/application-row";
import type { MyApplication } from "@/lib/queries/profile";

/** Server component: maps each application to an interactive row. */
export function ApplicationsList({ items }: { items: MyApplication[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
        You haven&apos;t applied to any clubs yet.{" "}
        <Link href="/clubs" className="font-medium text-indigo">
          Browse clubs →
        </Link>
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((app) => (
        <ApplicationRow key={app.id} app={app} />
      ))}
    </ul>
  );
}
