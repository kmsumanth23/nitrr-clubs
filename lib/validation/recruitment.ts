import { z } from "zod";

export const newRecruitmentSchema = z.object({
  club_id: z.string().uuid(),
  name: z.string().max(120).optional().or(z.literal("")),
  deadline: z.string().datetime().nullable().optional(),
  result_date: z.string().datetime().nullable().optional(),
  interview_mode: z
    .enum(["online", "offline", "hybrid"])
    .nullable()
    .optional(),
  interview_whatsapp_link: z
    .string()
    .url()
    .max(500)
    .nullable()
    .optional()
    .or(z.literal("")),
});

export type NewRecruitmentInput = z.infer<typeof newRecruitmentSchema>;
