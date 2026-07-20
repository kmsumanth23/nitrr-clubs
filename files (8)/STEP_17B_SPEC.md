# Step 17B — Role Tags on Drives + Members + Web-Admin Overlay

Complete specification for autonomous implementation. Structured so Claude Code can execute both batches with `/goal` and self-verify each phase.

---

## Feature summary

Add **structural role tags** to club membership. Roles are assigned to members through drives (drive publishes with an accepted student → student becomes a member with that drive's `role_on_accept`). Admins can edit member roles individually or bulk-promote at cycle end. Web-admins (lead/manager/editor) get a second visual pill on their own `/profile` My Clubs cards.

**Roles are enum-structured, display-customizable:**
- 5 structural values (fixed): `volunteer`, `coordinator`, `core_coordinator`, `head_coordinator`, `overall_coordinator`
- Optional `role_label` custom display string per-drive (snapshotted to member on publish)
- Default display labels when no custom set: "Volunteer", "Coordinator", "Core Coordinator", "Head Coordinator", "Overall Coordinator"

**Year-role advisory mapping** (soft warning at drive creation only, NEVER blocking):
- `volunteer` → Year 1
- `coordinator` → Year 2
- `core_coordinator` → Year 3
- `head_coordinator` → Year 4
- `overall_coordinator` → Year 4

**Bulk promotion at cycle end:** admin selects members via UI, each promoted one tier up (volunteer → coordinator, coordinator → core_coordinator, etc.). Members with `exclude_from_promote = true` are filtered out of the selection UI by default. `overall_coordinator` has no promotion (top of hierarchy).

---

## Full architectural context

### Existing schema (pre-17B — DO NOT modify unrelated columns)

```sql
club_members (
  club_id uuid,
  profile_id uuid,
  joined_at timestamptz,
  primary key (club_id, profile_id)
)

recruitments (
  id uuid,
  club_id uuid,
  name text,
  description text,
  target_years int[] DEFAULT '{1,2,3,4}',
  deadline timestamptz,
  result_date timestamptz,
  published_at timestamptz,
  results_published_at timestamptz,
  results_published_by uuid,
  interview_whatsapp_link text NOT NULL,
  community_whatsapp_link text,
  interview_mode text,
  created_by uuid,
  created_at timestamptz
)
```

### Post-17B schema (new columns)

```sql
club_members (
  ...existing columns...,
  role text NOT NULL DEFAULT 'volunteer'
    CHECK (role IN ('volunteer', 'coordinator', 'core_coordinator', 'head_coordinator', 'overall_coordinator')),
  role_label text NULL,
  exclude_from_promote boolean NOT NULL DEFAULT false,
  source_recruitment_id uuid NULL REFERENCES recruitments(id) ON DELETE SET NULL
)

recruitments (
  ...existing columns...,
  role_on_accept text NOT NULL DEFAULT 'volunteer'
    CHECK (role_on_accept IN ('volunteer', 'coordinator', 'core_coordinator', 'head_coordinator', 'overall_coordinator')),
  role_label text NULL
)
```

### Existing RPCs to modify

- `create_drive(club_id, name, description, target_years, deadline, result_date, interview_whatsapp_link, community_whatsapp_link)` → add `role_on_accept text`, `role_label text` params
- `update_drive(...)` → add same two params
- `publish_recruitment_results(recruitment_id)` → write `role`, `role_label`, `source_recruitment_id` on club_members INSERT

### New RPCs to create

- `update_member_role(club_id_in uuid, profile_id_in uuid, role_in text, role_label_in text)` — lead/sysadmin only
- `toggle_member_exclude_from_promote(club_id_in uuid, profile_id_in uuid, exclude_in boolean)` — lead/sysadmin only
- `bulk_promote_members(club_id_in uuid, member_selections jsonb)` — lead/sysadmin only; accepts `[{"profile_id": "...", "new_role": "..."}, ...]`; atomic

### RLS + grants

All new RPCs are `SECURITY DEFINER` with `search_path = public` set. All need `grant execute` **in the same migration file** (Lesson 16 — grants co-located).

`club_members` new columns are readable by any authenticated user via existing RLS. Only writes are gated via RPCs.

---

## BATCH 1 — Server layer

### Files to change/create

| Action | File |
|---|---|
| new | `supabase/17b_role_tags.sql` |
| patch | `lib/queries/admin-drives.ts` |
| patch | `lib/queries/apply.ts` |
| patch | `lib/queries/profile.ts` |
| patch | `lib/queries/admin-members.ts` |
| patch | `lib/validation/drive.ts` |
| patch | `lib/actions/drive.ts` |
| new | `lib/roles.ts` |
| new | `lib/validation/member.ts` |
| new | `lib/actions/member.ts` |
| patch | `lib/queries/admin-applications.ts` (defensive: getApplicationsForDrive returns drive.role_on_accept for UI awareness) |
| patch | `lib/audit/categorize.ts` (add `bulk_promote_members` to Members category) |
| patch | `lib/audit/format.tsx` (add sentence template for `bulk_promote_members`) |

### `supabase/17b_role_tags.sql` — full contents

```sql
-- =========================================================================
-- 17B — Role tags on drives + members
-- =========================================================================

-- ---- 1) Schema additions ---------------------------------------------

-- club_members role columns
alter table club_members
  add column if not exists role text NOT NULL DEFAULT 'volunteer'
    CHECK (role IN ('volunteer', 'coordinator', 'core_coordinator', 'head_coordinator', 'overall_coordinator'));

alter table club_members
  add column if not exists role_label text NULL;

alter table club_members
  add column if not exists exclude_from_promote boolean NOT NULL DEFAULT false;

alter table club_members
  add column if not exists source_recruitment_id uuid NULL
    REFERENCES recruitments(id) ON DELETE SET NULL;

-- recruitments role columns
alter table recruitments
  add column if not exists role_on_accept text NOT NULL DEFAULT 'volunteer'
    CHECK (role_on_accept IN ('volunteer', 'coordinator', 'core_coordinator', 'head_coordinator', 'overall_coordinator'));

alter table recruitments
  add column if not exists role_label text NULL;


-- ---- 2) Extend create_drive with role params -------------------------

drop function if exists create_drive(uuid, text, text, int[], timestamptz, timestamptz, text, text);

create or replace function create_drive(
  club_id_in uuid,
  name_in text,
  description_in text,
  target_years_in int[],
  deadline_in timestamptz,
  result_date_in timestamptz,
  interview_whatsapp_link_in text,
  community_whatsapp_link_in text,
  role_on_accept_in text,   -- 17B: new
  role_label_in text        -- 17B: new
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  is_super boolean;
  is_lead boolean;
  new_drive_id uuid;
begin
  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = club_id_in and profile_id = auth.uid() and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can create drives.' using errcode = '42501';
  end if;

  if name_in is null or length(trim(name_in)) = 0 then
    raise exception 'Drive name is required.' using errcode = '22023';
  end if;
  if array_length(target_years_in, 1) is null then
    raise exception 'At least one target year is required.' using errcode = '22023';
  end if;
  if interview_whatsapp_link_in is null or length(trim(interview_whatsapp_link_in)) = 0 then
    raise exception 'Interview WhatsApp link is required.' using errcode = '22023';
  end if;

  -- Default role_on_accept to volunteer if null/empty
  if role_on_accept_in is null or length(trim(role_on_accept_in)) = 0 then
    role_on_accept_in := 'volunteer';
  end if;

  insert into recruitments (
    club_id, name, description, target_years,
    deadline, result_date,
    interview_whatsapp_link, community_whatsapp_link,
    role_on_accept, role_label,
    created_by, published_at
  ) values (
    club_id_in, trim(name_in),
    nullif(trim(coalesce(description_in, '')), ''),
    target_years_in,
    deadline_in, result_date_in,
    trim(interview_whatsapp_link_in),
    nullif(trim(coalesce(community_whatsapp_link_in, '')), ''),
    role_on_accept_in,
    nullif(trim(coalesce(role_label_in, '')), ''),
    auth.uid(), null
  )
  returning id into new_drive_id;

  insert into audit_log (actor_id, action, target_club_id, details)
  values (
    auth.uid(), 'create_drive', club_id_in,
    jsonb_build_object(
      'drive_id', new_drive_id, 'name', name_in,
      'target_years', target_years_in, 'role_on_accept', role_on_accept_in
    )
  );

  return new_drive_id;
end;
$$;

grant execute on function create_drive(
  uuid, text, text, int[], timestamptz, timestamptz, text, text, text, text
) to authenticated;


-- ---- 3) Extend update_drive with role params -------------------------

drop function if exists update_drive(uuid, text, text, int[], timestamptz, timestamptz, text, text);

create or replace function update_drive(
  drive_id_in uuid,
  name_in text,
  description_in text,
  target_years_in int[],
  deadline_in timestamptz,
  result_date_in timestamptz,
  interview_whatsapp_link_in text,
  community_whatsapp_link_in text,
  role_on_accept_in text,   -- 17B: new
  role_label_in text        -- 17B: new
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  the_club_id uuid;
  is_super boolean;
  tier text;
  phase text;
begin
  select club_id into the_club_id from recruitments where id = drive_id_in;
  if the_club_id is null then
    raise exception 'Drive not found.' using errcode = '22023';
  end if;

  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select admin_role into tier from club_admins
    where club_id = the_club_id and profile_id = auth.uid();

  if not (coalesce(is_super, false) or tier in ('lead', 'manager')) then
    raise exception 'Only lead, manager, or sysadmin can edit drives.'
      using errcode = '42501';
  end if;

  select recruitment_phase(drive_id_in) into phase;
  if phase = 'result' then
    raise exception 'Drive is locked in result phase.' using errcode = '22023';
  end if;

  if name_in is null or length(trim(name_in)) = 0 then
    raise exception 'Drive name is required.' using errcode = '22023';
  end if;
  if array_length(target_years_in, 1) is null then
    raise exception 'At least one target year is required.' using errcode = '22023';
  end if;
  if interview_whatsapp_link_in is null or length(trim(interview_whatsapp_link_in)) = 0 then
    raise exception 'Interview WhatsApp link is required.' using errcode = '22023';
  end if;

  if role_on_accept_in is null or length(trim(role_on_accept_in)) = 0 then
    role_on_accept_in := 'volunteer';
  end if;

  update recruitments
     set name = trim(name_in),
         description = nullif(trim(coalesce(description_in, '')), ''),
         target_years = target_years_in,
         deadline = deadline_in,
         result_date = result_date_in,
         interview_whatsapp_link = trim(interview_whatsapp_link_in),
         community_whatsapp_link = nullif(trim(coalesce(community_whatsapp_link_in, '')), ''),
         role_on_accept = role_on_accept_in,
         role_label = nullif(trim(coalesce(role_label_in, '')), '')
   where id = drive_id_in;
end;
$$;

grant execute on function update_drive(
  uuid, text, text, int[], timestamptz, timestamptz, text, text, text, text
) to authenticated;


-- ---- 4) Update publish_recruitment_results to write role -------------

-- IMPORTANT: preserve existing publish logic. Only ADD the columns to the INSERT.
-- Current publish RPC: locates accepted applications, INSERTs each into club_members,
-- writes publish_results audit entry.

create or replace function publish_recruitment_results(recruitment_id_in uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  the_club_id uuid;
  the_role text;
  the_role_label text;
  is_super boolean;
  is_lead boolean;
  pending_count int;
  members_added int := 0;
begin
  select club_id, role_on_accept, role_label
    into the_club_id, the_role, the_role_label
    from recruitments where id = recruitment_id_in;
  if the_club_id is null then
    raise exception 'Drive not found.' using errcode = '22023';
  end if;

  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = the_club_id and profile_id = auth.uid() and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can publish results.' using errcode = '42501';
  end if;

  select count(*) into pending_count from applications
    where recruitment_id = recruitment_id_in and status in ('pending', 'reviewing');
  if pending_count > 0 then
    raise exception 'Cannot publish: % applications still pending or reviewing.', pending_count
      using errcode = '22023';
  end if;

  -- Materialize accepted applicants as members
  -- 17B: write role, role_label snapshot, source_recruitment_id
  insert into club_members (
    club_id, profile_id, joined_at,
    role, role_label, source_recruitment_id
  )
  select the_club_id, a.profile_id, now(),
         the_role, the_role_label, recruitment_id_in
    from applications a
   where a.recruitment_id = recruitment_id_in and a.status = 'accepted'
   on conflict (club_id, profile_id) do nothing;

  get diagnostics members_added = row_count;

  update recruitments
     set results_published_at = now(), results_published_by = auth.uid()
   where id = recruitment_id_in;

  insert into audit_log (actor_id, action, target_club_id, details)
  values (
    auth.uid(), 'publish_results', the_club_id,
    jsonb_build_object(
      'drive_id', recruitment_id_in,
      'members_added', members_added,
      'role', the_role
    )
  );
end;
$$;

grant execute on function publish_recruitment_results(uuid) to authenticated;


-- ---- 5) NEW: update_member_role -------------------------------------

create or replace function update_member_role(
  club_id_in uuid,
  profile_id_in uuid,
  role_in text,
  role_label_in text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  is_super boolean;
  is_lead boolean;
begin
  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = club_id_in and profile_id = auth.uid() and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can edit member roles.' using errcode = '42501';
  end if;

  if role_in not in ('volunteer', 'coordinator', 'core_coordinator', 'head_coordinator', 'overall_coordinator') then
    raise exception 'Invalid role: %', role_in using errcode = '22023';
  end if;

  update club_members
     set role = role_in,
         role_label = nullif(trim(coalesce(role_label_in, '')), '')
   where club_id = club_id_in and profile_id = profile_id_in;

  if not found then
    raise exception 'Member not found.' using errcode = '22023';
  end if;
end;
$$;

grant execute on function update_member_role(uuid, uuid, text, text) to authenticated;


-- ---- 6) NEW: toggle_member_exclude_from_promote ----------------------

create or replace function toggle_member_exclude_from_promote(
  club_id_in uuid,
  profile_id_in uuid,
  exclude_in boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  is_super boolean;
  is_lead boolean;
begin
  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = club_id_in and profile_id = auth.uid() and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can toggle promotion exclusion.' using errcode = '42501';
  end if;

  update club_members
     set exclude_from_promote = exclude_in
   where club_id = club_id_in and profile_id = profile_id_in;

  if not found then
    raise exception 'Member not found.' using errcode = '22023';
  end if;
end;
$$;

grant execute on function toggle_member_exclude_from_promote(uuid, uuid, boolean) to authenticated;


-- ---- 7) NEW: bulk_promote_members -----------------------------------
-- Accepts JSONB array: [{"profile_id": "uuid", "new_role": "coordinator"}, ...]
-- Atomically updates each member. Writes audit_log entry.

create or replace function bulk_promote_members(
  club_id_in uuid,
  member_selections jsonb
)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  is_super boolean;
  is_lead boolean;
  selection jsonb;
  promoted_count int := 0;
  target_profile_id uuid;
  target_new_role text;
begin
  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = club_id_in and profile_id = auth.uid() and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can bulk-promote members.' using errcode = '42501';
  end if;

  for selection in select * from jsonb_array_elements(member_selections)
  loop
    target_profile_id := (selection->>'profile_id')::uuid;
    target_new_role := selection->>'new_role';

    if target_new_role not in ('volunteer', 'coordinator', 'core_coordinator', 'head_coordinator', 'overall_coordinator') then
      raise exception 'Invalid role in selection: %', target_new_role using errcode = '22023';
    end if;

    update club_members
       set role = target_new_role,
           role_label = null  -- clear custom label on promotion; new role gets default
     where club_id = club_id_in and profile_id = target_profile_id;

    if found then
      promoted_count := promoted_count + 1;
    end if;
  end loop;

  insert into audit_log (actor_id, action, target_club_id, details)
  values (
    auth.uid(), 'bulk_promote_members', club_id_in,
    jsonb_build_object(
      'promoted_count', promoted_count,
      'selections', member_selections
    )
  );

  return promoted_count;
end;
$$;

grant execute on function bulk_promote_members(uuid, jsonb) to authenticated;


-- ---- Sanity checks (uncomment locally) -------------------------------
-- select column_name, data_type from information_schema.columns
-- where table_name = 'club_members' and column_name in ('role', 'role_label', 'exclude_from_promote', 'source_recruitment_id');
--
-- select column_name, data_type from information_schema.columns
-- where table_name = 'recruitments' and column_name in ('role_on_accept', 'role_label');
```

### `lib/roles.ts` — full contents

```typescript
/**
 * Role tag helpers — step 17B.
 * Structural roles are fixed enum; display labels can be customized per-drive
 * (snapshotted to member on publish).
 */

export const ROLE_ENUM = [
  "volunteer",
  "coordinator",
  "core_coordinator",
  "head_coordinator",
  "overall_coordinator",
] as const;

export type Role = (typeof ROLE_ENUM)[number];

export const ROLE_DEFAULT_LABELS: Record<Role, string> = {
  volunteer: "Volunteer",
  coordinator: "Coordinator",
  core_coordinator: "Core Coordinator",
  head_coordinator: "Head Coordinator",
  overall_coordinator: "Overall Coordinator",
};

/** Year advisory mapping — used ONLY for soft warnings at drive creation. */
export const ROLE_ADVISORY_YEAR: Record<Role, number> = {
  volunteer: 1,
  coordinator: 2,
  core_coordinator: 3,
  head_coordinator: 4,
  overall_coordinator: 4,
};

/** Promotion tier map — next role up. `overall_coordinator` has no promotion. */
export const ROLE_PROMOTION_NEXT: Record<Role, Role | null> = {
  volunteer: "coordinator",
  coordinator: "core_coordinator",
  core_coordinator: "head_coordinator",
  head_coordinator: "overall_coordinator",
  overall_coordinator: null,
};

/**
 * Return the display label for a role, falling back to the default if
 * no custom label is set.
 */
export function displayRoleLabel(role: Role, customLabel?: string | null): string {
  if (customLabel && customLabel.trim().length > 0) return customLabel;
  return ROLE_DEFAULT_LABELS[role];
}

/**
 * Check if a role's advisory year is in the drive's target_years array.
 * Returns null if matched, or a warning message string if mismatched.
 * NEVER blocking — this is UI advisory only.
 */
export function roleYearAdvisory(
  role: Role,
  targetYears: number[],
): string | null {
  const advisoryYear = ROLE_ADVISORY_YEAR[role];
  if (targetYears.includes(advisoryYear)) return null;
  return `${ROLE_DEFAULT_LABELS[role]} typically goes to Year ${advisoryYear} students. This drive targets Year ${targetYears.join(", ")}. Continue if intentional.`;
}
```

### `lib/validation/member.ts` — full contents

```typescript
import { z } from "zod";
import { ROLE_ENUM } from "@/lib/roles";

/** Update a single member's role (individual admin edit). */
export const updateMemberRoleSchema = z.object({
  clubId: z.string().uuid(),
  profileId: z.string().uuid(),
  role: z.enum(ROLE_ENUM),
  roleLabel: z.string().trim().max(100).optional().nullable(),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

/** Toggle exclude_from_promote for a member. */
export const toggleExcludeSchema = z.object({
  clubId: z.string().uuid(),
  profileId: z.string().uuid(),
  exclude: z.boolean(),
});
export type ToggleExcludeInput = z.infer<typeof toggleExcludeSchema>;

/** Bulk-promote members. Selections are ordered [{profile_id, new_role}]. */
export const bulkPromoteSchema = z.object({
  clubId: z.string().uuid(),
  selections: z.array(
    z.object({
      profileId: z.string().uuid(),
      newRole: z.enum(ROLE_ENUM),
    }),
  ).min(1, "At least one member must be selected"),
});
export type BulkPromoteInput = z.infer<typeof bulkPromoteSchema>;
```

### `lib/actions/member.ts` — full contents

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  updateMemberRoleSchema,
  toggleExcludeSchema,
  bulkPromoteSchema,
} from "@/lib/validation/member";

export type MemberActionResult = {
  ok?: boolean;
  error?: string;
  promoted_count?: number;
};

function revalidateMembers(clubSlug: string) {
  revalidatePath(`/admin/clubs/${clubSlug}/members`);
  revalidatePath(`/admin/clubs/${clubSlug}`);
  revalidatePath(`/profile`);
}

export async function updateMemberRole(
  _prev: MemberActionResult,
  formData: FormData,
): Promise<MemberActionResult> {
  const clubSlug = formData.get("__club_slug") as string;

  const parsed = updateMemberRoleSchema.safeParse({
    clubId: formData.get("clubId"),
    profileId: formData.get("profileId"),
    role: formData.get("role"),
    roleLabel: formData.get("roleLabel") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_member_role", {
    club_id_in: parsed.data.clubId,
    profile_id_in: parsed.data.profileId,
    role_in: parsed.data.role,
    role_label_in: parsed.data.roleLabel ?? null,
  });
  if (error) {
    console.error("updateMemberRole rpc failed:", error);
    return { error: error.message };
  }

  revalidateMembers(clubSlug);
  return { ok: true };
}

export async function toggleMemberExclude(
  _prev: MemberActionResult,
  formData: FormData,
): Promise<MemberActionResult> {
  const clubSlug = formData.get("__club_slug") as string;

  const parsed = toggleExcludeSchema.safeParse({
    clubId: formData.get("clubId"),
    profileId: formData.get("profileId"),
    exclude: formData.get("exclude") === "true",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("toggle_member_exclude_from_promote", {
    club_id_in: parsed.data.clubId,
    profile_id_in: parsed.data.profileId,
    exclude_in: parsed.data.exclude,
  });
  if (error) {
    console.error("toggleMemberExclude rpc failed:", error);
    return { error: error.message };
  }

  revalidateMembers(clubSlug);
  return { ok: true };
}

export async function bulkPromoteMembers(
  _prev: MemberActionResult,
  formData: FormData,
): Promise<MemberActionResult> {
  const clubSlug = formData.get("__club_slug") as string;

  const selectionsJson = formData.get("selections") as string;
  const rawSelections = JSON.parse(selectionsJson ?? "[]");

  const parsed = bulkPromoteSchema.safeParse({
    clubId: formData.get("clubId"),
    selections: rawSelections,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bulk_promote_members", {
    club_id_in: parsed.data.clubId,
    member_selections: parsed.data.selections.map((s) => ({
      profile_id: s.profileId,
      new_role: s.newRole,
    })),
  });
  if (error) {
    console.error("bulkPromoteMembers rpc failed:", error);
    return { error: error.message };
  }

  revalidateMembers(clubSlug);
  return { ok: true, promoted_count: data as unknown as number };
}
```

### Patches for existing query files

#### `lib/queries/admin-drives.ts`

- Extend `DriveListItem` and `DriveWithQuestions` interfaces with:
  ```ts
  role_on_accept: string;
  role_label: string | null;
  ```
- Update SELECT statements in `listDrivesForClub` and `getDriveWithQuestions` to include `role_on_accept, role_label`
- Update mappers

#### `lib/queries/apply.ts`

- Extend `DriveForApply.drive` with `role_on_accept, role_label` (for future UI showing "You'll be a Coordinator if accepted")
- Update SELECT in `getDriveForApply`
- Update mapper

#### `lib/queries/profile.ts`

- Extend `MyMembership` interface:
  ```ts
  role: string;
  role_label: string | null;
  exclude_from_promote: boolean;
  admin_tier: string | null; // 17B: joined from club_admins for web-admin overlay
  ```
- Update `getMyMemberships` SELECT to include the new club_members columns AND a `.select("club_admins!inner(admin_role)")` sub-query OR a two-query pattern to fetch admin tier (respect Lesson 21 — if querying anon-reachable surface, use two queries; profile is authenticated so join is safe)
- Update mapper

#### `lib/queries/admin-members.ts`

- Extend `MembershipDetail` interface with role columns + exclude flag + source_recruitment_id
- Update `getMembersForClub` SELECT to include role columns
- Add new export: `getMembersGroupedByRole(clubId: string)` — returns `Record<Role, MembershipDetail[]>` with roles in order [overall_coordinator, head_coordinator, core_coordinator, coordinator, volunteer], empty roles omitted

#### `lib/queries/admin-applications.ts` (defensive patch)

- `getApplicationsForDrive` return type — no changes needed unless UI needs `drive.role_on_accept` for context (which it does for the drive header). If so: extend `DriveWithQuestions` type carries through (already covered in admin-drives.ts patch).

#### `lib/validation/drive.ts`

- Extend `createDriveSchema` and `updateDriveSchema` with:
  ```ts
  roleOnAccept: z.enum(ROLE_ENUM).default("volunteer"),
  roleLabel: z.string().trim().max(100).optional().nullable(),
  ```
- Import `ROLE_ENUM` from `@/lib/roles`

#### `lib/actions/drive.ts`

- `createDrive`: parse `roleOnAccept` and `roleLabel` from formData; pass to RPC as `role_on_accept_in`, `role_label_in`
- `updateDrive`: same

#### `lib/audit/categorize.ts`

- Add `bulk_promote_members` and `update_member_role` and `toggle_member_exclude_from_promote` to `MEMBER_ACTIONS` set

#### `lib/audit/format.tsx`

- Add sentence templates for the three new member actions

---

## BATCH 2 — UI layer

### Files to change/create

| Action | File |
|---|---|
| patch | `components/admin/drive-editor-form.tsx` — role dropdown + custom label field + year advisory |
| patch | `components/admin/member-row.tsx` — role display + edit modal + exclude toggle |
| new | `components/admin/member-edit-modal.tsx` — role edit UI |
| new | `components/admin/bulk-promote-modal.tsx` — cycle-end batch promotion UI |
| patch | `app/(admin)/admin/clubs/[slug]/members/page.tsx` — grouped-by-role display + bulk promote button |
| patch | `components/profile/my-clubs-list.tsx` — role tag + web-admin overlay pill |
| patch | `lib/queries/profile.ts` — MyMembership already extended in Batch 1 |

### Drive editor form patch

Location: `components/admin/drive-editor-form.tsx`

**Add state near existing:**
```tsx
const [roleOnAccept, setRoleOnAccept] = React.useState<Role>(
  (drive?.role_on_accept as Role) ?? "volunteer",
);
const [roleLabel, setRoleLabel] = React.useState<string>(
  drive?.role_label ?? "",
);
```

**Add UI section in Section 1 (below community link):**
```tsx
<div className="rounded-2xl border border-line bg-cream/40 p-4">
  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
    Role assigned on acceptance
  </h4>

  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">
        Role
      </label>
      <select
        name="roleOnAccept"
        value={roleOnAccept}
        onChange={(e) => setRoleOnAccept(e.target.value as Role)}
        disabled={readOnly}
        className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo disabled:bg-cream/40"
      >
        {ROLE_ENUM.map((r) => (
          <option key={r} value={r}>{ROLE_DEFAULT_LABELS[r]}</option>
        ))}
      </select>
    </div>

    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">
        Custom label{" "}
        <span className="text-[11px] font-normal text-ink-soft">(optional)</span>
      </label>
      <input
        name="roleLabel"
        type="text"
        value={roleLabel}
        onChange={(e) => setRoleLabel(e.target.value)}
        disabled={readOnly}
        placeholder={`e.g., "Team Captain" (defaults to "${ROLE_DEFAULT_LABELS[roleOnAccept]}")`}
        maxLength={100}
        className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo disabled:bg-cream/40"
      />
    </div>
  </div>

  {/* Year advisory warning */}
  {(() => {
    const advisory = roleYearAdvisory(roleOnAccept, targetYears);
    return advisory ? (
      <p className="mt-2 inline-flex items-start gap-1 text-[11px] text-clay">
        <IconAlertTriangle size={11} className="mt-0.5" /> {advisory}
      </p>
    ) : null;
  })()}

  <p className="mt-2 text-[11px] text-ink-soft">
    All students accepted through this drive will get this role. Custom label
    overrides the default display name.
  </p>
</div>
```

Imports needed:
```tsx
import { ROLE_ENUM, ROLE_DEFAULT_LABELS, roleYearAdvisory, type Role } from "@/lib/roles";
```

### Member row patch

Location: `components/admin/member-row.tsx`

**Add role display next to member name:**
```tsx
<div className="min-w-0">
  <div className="text-sm font-medium text-ink">{member.full_name}</div>
  <div className="mt-1 flex items-center gap-2">
    <span className="rounded-full bg-indigo-soft px-2 py-0.5 text-[10px] font-medium text-indigo">
      {displayRoleLabel(member.role as Role, member.role_label)}
    </span>
    {member.exclude_from_promote && (
      <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] text-ink-soft" title="Excluded from bulk promotion">
        Locked
      </span>
    )}
    <span className="text-[11px] text-ink-soft">
      {member.roll_number} · Year {member.year}
    </span>
  </div>
</div>
```

**Add edit button + modal trigger:**
```tsx
<button
  onClick={() => setEditOpen(true)}
  className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-soft hover:border-ink/40"
>
  Edit role
</button>

<Modal open={editOpen} onClose={() => setEditOpen(false)}>
  <MemberEditModal
    member={member}
    clubId={clubId}
    clubSlug={clubSlug}
    onClose={() => setEditOpen(false)}
  />
</Modal>
```

### Member edit modal — new file

Location: `components/admin/member-edit-modal.tsx`

Shows:
- Role dropdown (5 structural values)
- Custom label input (optional, placeholder = default label)
- Exclude from promote toggle
- Save button

Uses `updateMemberRole` and `toggleMemberExclude` actions. Two separate mini-forms OR one form that fires both actions sequentially — implementer's choice, prefer one form with both fields for atomicity.

Include:
- Grep-safe placement: Modal renders OUTSIDE any parent form (Lesson 7 — nested forms cause hydration errors)

### Bulk promote modal — new file

Location: `components/admin/bulk-promote-modal.tsx`

**Design:**
- Header: "Promote members — end of cycle"
- Body: list all members grouped by current role (order: overall_coordinator → volunteer)
- Each row: checkbox (default checked if not excluded), member name, current role → new role arrow
- Members with `exclude_from_promote = true` are UNCHECKED by default but still shown
- Members with role `overall_coordinator` are grayed out (no promotion available)
- Footer: preview text — "N members will be promoted"
- Confirm button → `bulkPromoteMembers` action

**Payload shape:**
```json
[
  {"profileId": "uuid", "newRole": "coordinator"},
  ...
]
```

Client-side: derives `newRole` from `ROLE_PROMOTION_NEXT[current_role]`. Admin can override per-row via a small dropdown before confirming (optional in v1 — start with auto-map only).

### Members page patch

Location: `app/(admin)/admin/clubs/[slug]/members/page.tsx`

**Changes:**
- Use `getMembersGroupedByRole(clubId)` instead of flat `getMembersForClub`
- Render sections per role (order: overall_coordinator → volunteer), skip empty roles
- Add "Promote members" button in header (opens BulkPromoteModal)
- Modal renders outside main content flow (top-level sibling)

**Grouped display structure:**
```tsx
{Object.entries(groupedMembers).map(([role, members]) => (
  <section key={role} className="mb-6">
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
      {ROLE_DEFAULT_LABELS[role as Role]} ({members.length})
    </h3>
    <ul className="space-y-2">
      {members.map((m) => (
        <MemberRow key={m.profile_id} member={m} clubId={club.id} clubSlug={slug} ... />
      ))}
    </ul>
  </section>
))}
```

### MyClubsList patch — web-admin overlay

Location: `components/profile/my-clubs-list.tsx`

**In MembershipCard, add role + admin tier pills next to club name area:**
```tsx
<div className="mb-3 flex items-start justify-between gap-2">
  <div className="min-w-0 flex-1">
    <Link href={`/clubs/${club.slug}`} className="block truncate text-sm font-semibold text-ink hover:text-indigo">
      {club.name}
    </Link>
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <span className="rounded-full bg-indigo-soft px-2 py-0.5 text-[10px] font-medium text-indigo">
        {displayRoleLabel(membership.role as Role, membership.role_label)}
      </span>
      {membership.admin_tier && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-clay-soft px-2 py-0.5 text-[10px] font-medium text-clay"
          title={`You're a ${membership.admin_tier} of this club's web admin team`}
        >
          <IconShieldCheck size={9} /> Web {membership.admin_tier}
        </span>
      )}
    </div>
  </div>
  {club.category?.name && (
    <span className="rounded-full bg-beige px-1.5 py-0.5 text-[10px] capitalize text-ink-soft">
      {club.category.name}
    </span>
  )}
</div>
```

Import needed:
```tsx
import { IconShieldCheck } from "@tabler/icons-react";
import { displayRoleLabel, type Role } from "@/lib/roles";
```

---

## Testing plan

### Batch 1 verification (server layer)

1. Run migration `17b_role_tags.sql` in Supabase SQL editor
2. Verify columns:
   ```sql
   select column_name, data_type from information_schema.columns
   where table_name = 'club_members' and column_name in ('role', 'role_label', 'exclude_from_promote', 'source_recruitment_id');
   -- Expected: 4 rows
   ```
3. `npx tsc --noEmit` should pass
4. Test RPCs manually:
   ```sql
   -- Create a test drive with role
   select create_drive(
     '<club_uuid>'::uuid, 'Test Drive', null, array[1,2],
     now() + interval '7 days', null,
     'https://chat.whatsapp.com/test', null,
     'coordinator', 'Junior Coordinator'
   );

   -- Update a member's role (need a member first)
   select update_member_role('<club_uuid>'::uuid, '<profile_uuid>'::uuid, 'core_coordinator', null);

   -- Toggle exclude
   select toggle_member_exclude_from_promote('<club_uuid>'::uuid, '<profile_uuid>'::uuid, true);
   ```

### Batch 2 verification (UI layer)

1. **Drive editor:** create new drive → role dropdown appears + custom label field + year advisory works
2. **Publish flow:** publish a drive with `role_on_accept = 'coordinator'` → accepted student gets `role = 'coordinator'` in `club_members`
3. **Members page:** grouped display renders sections per role; empty roles hidden
4. **Member edit:** click "Edit role" on a member → modal opens → change role → save → member row updates
5. **Bulk promote:** click "Promote members" → modal shows all members grouped, excluded ones unchecked → confirm → all promoted
6. **Profile My Clubs:** as a member, see role pill on the card. As a web-admin (Gladiator on Shaurya), see both pills — role tag + "Web lead"

### Regression tests

- Existing drive create/update flows still work (extra role fields default to `volunteer` when not provided)
- Existing `remove_member` still works
- Audit log renders new actions properly
- No nested `<form>` warnings in browser console (Lesson 7 + 23)

---

## Follow the codebase conventions

- **Result type:** flat `{ok?, error?, ...}` — NOT discriminated unions (see `ReviewResult`, `DriveResult` for pattern)
- **File paths:** flat output uses `__` as path separator (e.g., `member-edit-modal.tsx` in `components/admin/`)
- **Nested forms:** modals containing forms must render OUTSIDE any parent `<form>` (Lesson 7)
- **Grants co-located:** every `create or replace function` needs `grant execute` in the same migration file
- **Draft filter:** any "most-recent recruitment" queries need `.not("published_at", "is", null)`
- **Sticky state:** `useActionState` state persists across successful dispatches — watch `isPending` transitions, not `state.ok`
- **Whitespace preservation:** question prompts + role labels render with `whitespace-pre-wrap` where multi-line input possible
- **FK disambiguation:** any query embedding `profiles` FROM `applications` needs explicit `profiles!applications_profile_id_fkey(...)`

---

## Explicit non-goals

Do NOT:
- Add role tags to public club team display (`/clubs/[slug]`) — deferred to step 21
- Add year-role warning to member edit modal — intentional overrides only trigger warnings in drive editor
- Change `remove_member` behavior
- Modify `applications` schema
- Introduce a manual "add member" flow (currently members only materialize via publish)
- Touch `club_team` table (curated display, unrelated to role tags)
- Touch `club_admins.admin_role` structure (web-admin tiers are separate from member roles)

---

## Summary of interactions with existing features

**Interaction with 17A drive-scoped community link:**
- 17A shipped `recruitments.community_whatsapp_link` — that column is preserved
- 17B adds `club_members.source_recruitment_id` — enables live per-drive community link resolution for members
- `getMyMemberships` should now use `source_recruitment_id → drive.community_whatsapp_link` as first fallback, then `clubs.community_whatsapp_link` — see if this simplification is applied. If the two-query pattern from 17A Addendum 1 is still in place, it can now be replaced with the direct join since `source_recruitment_id` is available.

**Interaction with 16C interview link:**
- Interview link reveal logic unchanged — still gated on `!results_published_at && status NOT IN (withdrawn, removed)`
- Role tags don't affect interview link visibility

**Interaction with `exclude_from_promote`:**
- UI-only flag. `publish_recruitment_results` does NOT check this flag (it uses ON CONFLICT DO NOTHING, so re-materialization would be blocked by the unique constraint anyway)
- Only `bulk_promote_members` UI filters members based on this flag
- Individual `update_member_role` calls bypass this flag (admin explicit action)

---

## After 17B lands

Say "17B clean" and proceed to 17C (departments per drive + ranked preferences + placement UI).
