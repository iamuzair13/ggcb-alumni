"use server";

/**
 * Auth server actions — sign-in / sign-out.
 * Lives in src/lib/actions (server-action convention); imported by client
 * components as action references only.
 */
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { sanitizeCallbackUrl } from "@/server/auth/callback-url";
import { policyFor } from "@/server/auth/route-policy";
import { AUTH_ERROR_CODES } from "@/server/auth/errors";
import { roleForEmail } from "@/server/auth/session";
import type { Role } from "@/lib/constants/roles";

export interface LoginFormState {
  error?: string;
  code?: string;
}

function roleHome(role: Role): string {
  return role === "alumni" ? "/dashboard" : "/admin";
}

/** callbackUrl may be used only if the policy lets that role see it. */
function permittedTarget(cb: string, role: Role): string {
  const policy = policyFor(cb);
  if (!policy || policy.roles === "public") return roleHome(role);
  if (policy.roles === "any") return cb;
  return policy.roles.includes(role) ? cb : roleHome(role);
}

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = sanitizeCallbackUrl(formData.get("callbackUrl"), "");

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      // Custom error classes carry .code from authorize().
      const code = (e.cause?.err as { code?: string } | undefined)?.code;
      if (code === AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED) {
        return {
          code: AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED,
          error:
            "This email is not verified yet. Contact the college if you did not receive a verification email.",
        };
      }
      if (code === AUTH_ERROR_CODES.RATE_LIMITED) {
        return {
          code: AUTH_ERROR_CODES.RATE_LIMITED,
          error: "Too many attempts. Please try again later.",
        };
      }
      return {
        code: AUTH_ERROR_CODES.INVALID,
        error: "Invalid email or password",
      };
    }
    throw e;
  }

  // Signed in — pick the target the role is actually allowed to see. The
  // just-issued session cookie isn't visible to getSession() in this same
  // request, so the role is re-read (one indexed query).
  const role = ((await roleForEmail(String(email))) ?? "alumni") as Role;
  redirect(permittedTarget(callbackUrl || roleHome(role), role));
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
