import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/constants/roles";

/**
 * Session/JWT type augmentation — the JWT carries ONLY sub, role,
 * sessionVersion, name, checkedAt. Nothing else (no email, no PII).
 */
declare module "next-auth" {
  interface User {
    role: Role;
    sessionVersion: number;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      role: Role;
      sessionVersion: number;
    } & Omit<DefaultSession["user"], "email">;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    sessionVersion?: number;
    checkedAt?: number;
  }
}
