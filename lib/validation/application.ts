import { z } from "zod";

/**
 * 16B: dynamic responses.
 *
 * Pre-16B, applications had a fixed shape {motivation, experience,
 * contribution}. Post-16B, each drive owns its question set and applications
 * are keyed by `question_id`. Response schemas are built per-submit against
 * the drive's current questions.
 *
 * Length policy:
 *   - short_text → max 250 chars (single-line answers)
 *   - long_text  → max 2000 chars (paragraph answers)
 * Required questions must have a non-empty trimmed value.
 */

export interface DriveQuestionForValidation {
  id: string;
  question_type: "short_text" | "long_text";
  required: boolean;
}

const SHORT_TEXT_MAX = 250;
const LONG_TEXT_MAX = 2000;

/** Build a Zod schema keyed by question id for a specific drive's questions.
 *  Callers hand in the drive's live question set at submit time. */
export function buildResponseSchema(
  questions: DriveQuestionForValidation[],
): z.ZodObject<Record<string, z.ZodString | z.ZodOptional<z.ZodString>>> {
  const shape: Record<string, z.ZodString | z.ZodOptional<z.ZodString>> = {};

  for (const q of questions) {
    const maxLen =
      q.question_type === "short_text" ? SHORT_TEXT_MAX : LONG_TEXT_MAX;

    const base = z
      .string()
      .trim()
      .max(maxLen, `Response too long (max ${maxLen} characters).`);

    if (q.required) {
      shape[q.id] = base.min(1, "This question is required.");
    } else {
      shape[q.id] = base.optional();
    }
  }

  return z.object(shape);
}

/** Trims + coerces empty-strings to undefined before validation so that
 *  optional questions don't fail their `.optional()` check when the client
 *  sends an empty string. */
export function normalizeResponsesInput(
  raw: Record<string, string>,
  questions: DriveQuestionForValidation[],
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const q of questions) {
    const v = (raw[q.id] ?? "").trim();
    if (v.length === 0 && !q.required) {
      out[q.id] = undefined;
    } else {
      out[q.id] = v;
    }
  }
  return out;
}
