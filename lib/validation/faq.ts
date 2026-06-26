import { z } from "zod";

export const faqSchema = z.object({
  question: z
    .string()
    .min(3, "Question must be at least 3 characters")
    .max(500, "Question must be at most 500 characters")
    .trim(),
  answer: z
    .string()
    .min(3, "Answer must be at least 3 characters")
    .max(5000, "Answer must be at most 5000 characters")
    .trim(),
  is_published: z.boolean().default(true),
});

export type FaqInput = z.infer<typeof faqSchema>;
