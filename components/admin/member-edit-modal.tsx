"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateMemberRole,
  toggleMemberExclude,
  type MemberResult,
} from "@/lib/actions/member";
import {
  ROLE_ENUM,
  ROLE_DEFAULT_LABELS,
  displayRoleLabel,
  type Role,
} from "@/lib/roles";
import type { ClubMemberView } from "@/lib/queries/admin-members";

/**
 * Body of the "Edit role" modal. Rendered by MemberRow INSIDE a `<Modal>` that
 * is a top-level sibling of the row — NOT nested inside any parent `<form>`
 * (Lesson 7 / Lesson 23). This component itself holds two sibling forms:
 *
 *   1. Role + custom label   → `update_member_role`
 *   2. Exclude-from-promote  → `toggle_member_exclude_from_promote`
 *
 * They're two separate RPCs, so two separate forms (siblings, never nested).
 * On either success we reload — mirrors the RemoveConfirm pattern in this
 * folder, which the SSR members page relies on to re-render fresh props.
 */
export function MemberEditModal({
  member,
  clubId,
  clubSlug,
  onClose,
}: {
  member: ClubMemberView;
  clubId: string;
  clubSlug: string;
  onClose: () => void;
}) {
  const [role, setRole] = React.useState<Role>(member.role);
  const [roleLabel, setRoleLabel] = React.useState<string>(
    member.role_label ?? "",
  );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-bold text-ink">
          Edit role — {member.profile?.full_name ?? "member"}
        </h3>
        <p className="mt-1 text-xs text-ink-soft">
          Currently {displayRoleLabel(member.role, member.role_label)}.
        </p>
      </div>

      <RoleForm
        clubId={clubId}
        clubSlug={clubSlug}
        profileId={member.profile_id}
        role={role}
        setRole={setRole}
        roleLabel={roleLabel}
        setRoleLabel={setRoleLabel}
        onClose={onClose}
      />

      <div className="border-t border-line pt-4">
        <ExcludeForm
          clubId={clubId}
          clubSlug={clubSlug}
          profileId={member.profile_id}
          exclude={member.exclude_from_promote}
        />
      </div>
    </div>
  );
}

/* ------------------------------- Role form ------------------------------- */

function RoleForm({
  clubId,
  clubSlug,
  profileId,
  role,
  setRole,
  roleLabel,
  setRoleLabel,
  onClose,
}: {
  clubId: string;
  clubSlug: string;
  profileId: string;
  role: Role;
  setRole: (r: Role) => void;
  roleLabel: string;
  setRoleLabel: (v: string) => void;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<MemberResult, FormData>(
    updateMemberRole,
    {},
  );

  React.useEffect(() => {
    if (state.ok) {
      onClose();
      window.location.reload();
    }
  }, [state.ok, onClose]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="__club_slug" value={clubSlug} />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Role</label>
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
        >
          {ROLE_ENUM.map((r) => (
            <option key={r} value={r}>
              {ROLE_DEFAULT_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Custom label{" "}
          <span className="text-[11px] font-normal text-ink-soft">
            (optional)
          </span>
        </label>
        <input
          name="roleLabel"
          type="text"
          value={roleLabel}
          onChange={(e) => setRoleLabel(e.target.value)}
          placeholder={`Defaults to "${ROLE_DEFAULT_LABELS[role]}"`}
          maxLength={100}
          className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
        />
      </div>

      {state.error && <p className="text-xs text-clay">{state.error}</p>}

      <div className="flex gap-2">
        <SaveRoleBtn />
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-cream"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function SaveRoleBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save role"}
    </button>
  );
}

/* ------------------------------ Exclude form ------------------------------ */

function ExcludeForm({
  clubId,
  clubSlug,
  profileId,
  exclude,
}: {
  clubId: string;
  clubSlug: string;
  profileId: string;
  exclude: boolean;
}) {
  const [state, formAction] = useActionState<MemberResult, FormData>(
    toggleMemberExclude,
    {},
  );

  React.useEffect(() => {
    if (state.ok) window.location.reload();
  }, [state.ok]);

  // Flip the current value — the button applies the opposite state.
  const nextExclude = !exclude;

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="__club_slug" value={clubSlug} />
      <input type="hidden" name="exclude" value={String(nextExclude)} />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Bulk promotion</p>
          <p className="text-[11px] text-ink-soft">
            {exclude
              ? "Excluded — this member is skipped in cycle-end promotion."
              : "Included — this member appears in cycle-end promotion."}
          </p>
        </div>
        <ExcludeBtn nextExclude={nextExclude} />
      </div>

      {state.error && <p className="text-xs text-clay">{state.error}</p>}
    </form>
  );
}

function ExcludeBtn({ nextExclude }: { nextExclude: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-shrink-0 rounded-full border border-line px-4 py-2 text-[11px] font-medium text-ink-soft hover:border-ink/40 disabled:opacity-60"
    >
      {pending ? "…" : nextExclude ? "Exclude" : "Include"}
    </button>
  );
}
