/**
 * Login-attempt audit — writes login_logs rows. NEVER breaks a request:
 * every write is wrapped so a logging failure cannot break a login (§4.5).
 */
import type postgres from "postgres";
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
        ${e.userId}, ${e.emailAttempted}, ${e.success}, ${e.reason},
        ${e.ip}, ${e.userAgent?.slice(0, 300) ?? null}
      )
    `;
  } catch {
    // Audit writes must never break the request — swallow, the app log
    // still records failures in the platform log.
  }
}
