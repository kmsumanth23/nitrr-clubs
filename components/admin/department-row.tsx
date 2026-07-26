"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  IconTrash,
  IconArrowUp,
  IconArrowDown,
} from "@tabler/icons-react";
import type { DriveDepartment } from "@/lib/queries/admin-drives";
import type { DriveResult } from "@/lib/actions/drive";

/**
 * Single department inline editor row.
 * - Name + community link fields save on blur via updateDriveDepartment
 * - Delete + reorder buttons visible in draft only (gated by parent props)
 * - In result phase, only name + link editable (reorder/delete hidden)
 */
export function DepartmentRow({
  department,
  driveId,
  clubSlug,
  canReorderUp,
  canReorderDown,
  canDelete,
  prevId,
  nextId,
  isResult,
  onUpdate,
  onDelete,
  onSwap,
}: {
  department: DriveDepartment;
  driveId: string;
  clubSlug: string;
  canReorderUp: boolean;
  canReorderDown: boolean;
  canDelete: boolean;
  prevId: string | null;
  nextId: string | null;
  isResult: boolean;
  onUpdate: (
    _prev: DriveResult,
    formData: FormData,
  ) => Promise<DriveResult>;
  onDelete: (
    _prev: DriveResult,
    formData: FormData,
  ) => Promise<DriveResult>;
  onSwap: (
    _prev: DriveResult,
    formData: FormData,
  ) => Promise<DriveResult>;
}) {
  const [name, setName] = React.useState(department.name);
  const [link, setLink] = React.useState(
    department.community_whatsapp_link ?? "",
  );

  const [updateState, updateAction] = useActionState<DriveResult, FormData>(
    onUpdate,
    {},
  );
  const [deleteState, deleteAction] = useActionState<DriveResult, FormData>(
    onDelete,
    {},
  );
  const [swapState, swapAction] = useActionState<DriveResult, FormData>(
    onSwap,
    {},
  );

  function saveIfChanged() {
    const nameChanged = name.trim() !== department.name;
    const linkChanged =
      link.trim() !== (department.community_whatsapp_link ?? "");
    if (!nameChanged && !linkChanged) return;

    const fd = new FormData();
    fd.append("departmentId", department.id);
    fd.append("driveId", driveId);
    fd.append("__club_slug", clubSlug);
    fd.append("name", name.trim());
    fd.append("communityWhatsappLink", link.trim());
    // React 19: useActionState dispatchers must run inside a transition
    // when called outside a <form action> prop.
    React.startTransition(() => updateAction(fd));
  }

  return (
    <li className="rounded-xl border border-line bg-white p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_1fr_auto]">
        {/* Reorder handles — draft only. Fixed 2-col grid so empty slots
            reserve their column and arrows stay column-aligned across rows
            (first row has no ↑, last row has no ↓, middle rows have both). */}
        <div className="grid grid-cols-[24px_24px] items-center gap-1">
          {canReorderUp && prevId ? (
            <ReorderButton
              driveId={driveId}
              clubSlug={clubSlug}
              idA={department.id}
              idB={prevId}
              onSubmit={swapAction}
              direction="up"
            />
          ) : (
            <div aria-hidden="true" />
          )}
          {canReorderDown && nextId ? (
            <ReorderButton
              driveId={driveId}
              clubSlug={clubSlug}
              idA={department.id}
              idB={nextId}
              onSubmit={swapAction}
              direction="down"
            />
          ) : (
            <div aria-hidden="true" />
          )}
        </div>

        {/* Name input */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveIfChanged}
          maxLength={100}
          placeholder="Department name"
          className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-indigo"
        />

        {/* Community link input */}
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onBlur={saveIfChanged}
          maxLength={500}
          placeholder="Optional WhatsApp group link"
          className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-indigo"
        />

        {/* Delete button — draft only */}
        {canDelete ? (
          <DeleteButton
            driveId={driveId}
            clubSlug={clubSlug}
            departmentId={department.id}
            onSubmit={deleteAction}
          />
        ) : (
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft/40"
            title={
              isResult
                ? "Deletion locked in result phase"
                : "Deletion locked after publish"
            }
          >
            <IconTrash size={13} />
          </span>
        )}
      </div>

      {updateState.error && (
        <p className="mt-1.5 text-[11px] text-clay">{updateState.error}</p>
      )}
      {deleteState.error && (
        <p className="mt-1.5 text-[11px] text-clay">{deleteState.error}</p>
      )}
      {swapState.error && (
        <p className="mt-1.5 text-[11px] text-clay">{swapState.error}</p>
      )}
    </li>
  );
}

/* ============================= Reorder button ============================= */

function ReorderButton({
  driveId,
  clubSlug,
  idA,
  idB,
  onSubmit,
  direction,
}: {
  driveId: string;
  clubSlug: string;
  idA: string;
  idB: string;
  onSubmit: (formData: FormData) => void;
  direction: "up" | "down";
}) {
  function handleClick() {
    const fd = new FormData();
    fd.append("driveId", driveId);
    fd.append("__club_slug", clubSlug);
    fd.append("idA", idA);
    fd.append("idB", idB);
    React.startTransition(() => onSubmit(fd));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Move ${direction}`}
      title={`Move ${direction}`}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-white text-ink-soft hover:bg-cream hover:text-ink"
    >
      {direction === "up" ? (
        <IconArrowUp size={11} />
      ) : (
        <IconArrowDown size={11} />
      )}
    </button>
  );
}

/* ============================= Delete button ============================= */

function DeleteButton({
  driveId,
  clubSlug,
  departmentId,
  onSubmit,
}: {
  driveId: string;
  clubSlug: string;
  departmentId: string;
  onSubmit: (formData: FormData) => void;
}) {
  const { pending } = useFormStatus();
  const [confirming, setConfirming] = React.useState(false);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    const fd = new FormData();
    fd.append("driveId", driveId);
    fd.append("__club_slug", clubSlug);
    fd.append("departmentId", departmentId);
    React.startTransition(() => onSubmit(fd));
    setConfirming(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title={confirming ? "Click again to confirm" : "Delete department"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
        confirming
          ? "border-clay bg-clay text-clay-fg"
          : "border-line bg-white text-ink-soft hover:border-clay/40 hover:text-clay"
      }`}
    >
      <IconTrash size={13} />
    </button>
  );
}
