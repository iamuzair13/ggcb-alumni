/** Alumni account settings — context.md §4.3 account block. */
export interface AccountInfo {
  email: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  sessionsActive: number;
}
