"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  submitApplication,
  type ApplicationResult,
} from "@/lib/actions/application";
import { WhatsAppLinkButton } from "@/components/ui/whatsapp-link-popup";

interface KnownProfile {
  full_name: string | null;
  roll_number: string | null;
  year: number | null;
  branch: string | null;
}

interface Question {
  id: string;
  prompt: string;
  question_type: "short_text" | "long_text";
  sort_order: number;
  required: boolean;
}

interface ExistingApplication {
  id: string;
  status: string;
  responses: Record<string, string>;
}

/**
 * Dynamic apply form. Renders one input per drive question.
 * If an existing application is passed (edit mode), pre-fills responses
 * and uses re-apply/edit copy on the submit button.
 */
export function ApplyForm({
  driveId,
  clubSlug,
  clubName,
  profile,
  questions,
  existingApplication,
  interviewWhatsappLink,
}: {
  driveId: string;
  clubSlug: string;
  clubName: string;
  profile: KnownProfile;
  questions: Question[];
  existingApplication: ExistingApplication | null;
  interviewWhatsappLink: string | null;
}) {
  const [state, formAction] = useActionState<ApplicationResult, FormData>(
    submitApplication,
    {},
  );

  const reapplying = existingApplication?.status === "withdrawn";
  const editing =
    existingApplication?.status === "pending" ||
    existingApplication?.status === "reviewing";

  const responses = existingApplication?.responses ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="driveId" value={driveId} />
      <input type="hidden" name="__club_slug" value={clubSlug} />

      {reapplying && (
        <div className="rounded-2xl border border-indigo-soft bg-indigo-soft px-4 py-3 text-xs text-indigo">
          You previously withdrew from {clubName}. Submitting will re-apply
          with your new answers.
        </div>
      )}

      {editing && (
        <div className="rounded-2xl border border-line bg-cream/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-soft">
              You&apos;ve already applied. You can update your answers until the
              deadline.
            </p>
            {interviewWhatsappLink && (
              <div className="flex items-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 py-1.5 pl-3 pr-1.5">
                <span className="text-[11px] font-medium text-[#25D366]">
                  Interview group
                </span>
                <WhatsAppLinkButton
                  url={interviewWhatsappLink}
                  label="Interview WhatsApp group"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-beige p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
          Applying as
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Name" value={profile.full_name} />
          <Field label="Roll number" value={profile.roll_number} />
          <Field label="Year" value={profile.year?.toString() ?? null} />
          <Field label="Branch" value={profile.branch} />
        </div>
      </div>

      {questions
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            defaultValue={responses[q.id] ?? ""}
          />
        ))}

      {state.error && (
        <p className="text-center text-xs text-clay">{state.error}</p>
      )}

      <Submit editing={editing} reapplying={reapplying} />
    </form>
  );
}

function QuestionField({
  question,
  defaultValue,
}: {
  question: Question;
  defaultValue: string;
}) {
  const name = `q_${question.id}`;
  const isShort = question.question_type === "short_text";
  const maxLength = isShort ? 250 : 2000;
  const placeholder = isShort
    ? "Short answer"
    : "Take your time — this is a paragraph question.";

  return (
    <div>
      <label className="mb-1.5 block whitespace-pre-wrap text-sm font-medium text-ink">
        {question.prompt}{" "}
        {question.required && <span className="text-clay">*</span>}
      </label>
      {isShort ? (
        <input
          type="text"
          name={name}
          defaultValue={defaultValue}
          required={question.required}
          maxLength={maxLength}
          placeholder={placeholder}
          className="w-full rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-indigo"
        />
      ) : (
        <textarea
          name={name}
          rows={4}
          defaultValue={defaultValue}
          required={question.required}
          maxLength={maxLength}
          placeholder={placeholder}
          className="w-full resize-none rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-indigo"
        />
      )}
      {!question.required && (
        <p className="mt-1 text-[11px] text-ink-soft">Optional.</p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[11px] text-ink-soft">{label}</div>
      <div className="font-medium text-ink">{value || "—"}</div>
    </div>
  );
}

function Submit({
  editing,
  reapplying,
}: {
  editing: boolean;
  reapplying: boolean;
}) {
  const { pending } = useFormStatus();
  const label = editing
    ? "Update application"
    : reapplying
      ? "Re-apply"
      : "Submit application";
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-indigo px-6 py-3 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      {pending ? "Submitting…" : label}
    </button>
  );
}
