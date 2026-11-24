/**
 * Login-attempt audit — writes login_logs rows. NEVER breaks a request:
 * every write is wrapped so a logging failure cannot break a login (§4.5).
 * Inputs are sanitised (spec §4.9): user_agent capped at the 300-char
 * column limit, reason single-lined — control chars can never enter a log.
 */
import type postgres from "postgres";
import { singleLine } from "@/server/email/escape";
import type { LoginLogReason } from "./errors";

export interface LoginLogEntry {
  userId: string | null;
  emailAttempted: string | null;
  success: boolean;
  reason: LoginLogReason;
  ip: string | null;
  userAgent: string | null;
}

export async function writeLoginLog(
  sql: postgres.Sql,
  e: LoginLogEntry,
): Promise<void> {
  try {
    await sql`
      INSERT INTO login_logs (user_id, email_attempted, success, reason, ip, user_agent)
      VALUES (
        ${e.userId}, ${e.emailAttempted}, ${e.success},
        ${e.reason ? singleLine(e.reason, 200) : null},
        ${e.ip}, ${e.userAgent ? singleLine(e.userAgent, 300) : null}
      )
    `;
  } catch {
    // Audit writes must never break the request — swallow, the app log
    // still records failures in the platform log.
  }
}
