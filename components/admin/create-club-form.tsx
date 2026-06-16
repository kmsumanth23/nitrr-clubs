"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createClubAction } from "@/lib/actions/sysadmin";
import { ProfileSearch } from "@/components/admin/profile-search";
import type { ProfileSearchResult } from "@/lib/queries/profile-search";

interface Category {
  id: string;
  name: string;
}

export function CreateClubForm({ categories }: { categories: Category[] }) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [lead, setLead] = React.useState<ProfileSearchResult | null>(null);
  const [state, formAction] = useActionState(createClubAction, {});

  // Auto-generate slug from name unless the user has typed something custom.
  const [slugTouched, setSlugTouched] = React.useState(false);
  React.useEffect(() => {
    if (!slugTouched) {
      const auto = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(auto);
    }
  }, [name, slugTouched]);

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="initialLeadProfileId"
        value={lead?.id ?? ""}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Club name <span className="text-clay">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
          className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Slug <span className="text-clay">*</span>
        </label>
        <input
          type="text"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          required
          maxLength={60}
          pattern="^[a-z0-9]([a-z0-9-]*[a-z0-9])?$"
          className="w-full rounded-xl border border-line bg-white p-2.5 text-sm font-mono text-ink outline-none focus:border-indigo"
        />
        <p className="mt-1 text-[11px] text-ink-soft">
          URL-safe identifier. Auto-generated from the name; editable. Lowercase
          letters, numbers, and hyphens only.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Category
        </label>
        <select
          name="categoryId"
          defaultValue=""
          className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
        >
          <option value="">— Uncategorized —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Initial lead <span className="text-clay">*</span>
        </label>
        <ProfileSearch selected={lead} onSelect={setLead} />
        <p className="mt-1 text-[11px] text-ink-soft">
          The first lead. They&apos;ll be added as `lead` admin automatically.
          They can promote others later.
        </p>
      </div>

      {state.error && (
        <p className="rounded-xl bg-clay-soft p-3 text-xs text-clay">
          {state.error}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <SubmitBtn disabled={!lead} />
      </div>
    </form>
  );
}

function SubmitBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Creating…" : "Create club"}
    </button>
  );
}
