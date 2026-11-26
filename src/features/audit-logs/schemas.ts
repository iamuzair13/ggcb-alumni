import { z } from "zod";

export const auditFilterSchema = z.object({
  actor: z.string().trim().max(80).optional(),
  action: z.string().trim().max(80).optional(),
  entity: z.string().trim().max(40).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type AuditFilterInput = z.infer<typeof auditFilterSchema>;
