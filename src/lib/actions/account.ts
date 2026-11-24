"use server";

/**
 * Public account actions (spec §4.2). Consumption is POST-only — token
 * pages render forms; a GET prefetch can never spend a token.
 * Neutral flows defer their expensive path to after() so response time
 * cannot reveal account existence.
 */
import { after } from "next/server";
import { headers } from "next/headers";
import { defineAction } from "@/server/auth/route";
import { getClientIp } from "@/server/auth/client-ip";
import {
  emailInput,
  tokenInput,
  passwordInput,
  requestPasswordReset as svcReset,
  resendVerification as svcResend,
  verifyEmail as svcVerify,
  resetWithToken,
  type ConsumeResult,
  type NeutralResult,
} from "@/server/services/account";

async function ip(): Promise<string | null> {
  return getClientIp(
    new Request("http://internal", { headers: await headers() }),
  );
}

export const requestPasswordResetAction = defineAction({
  roles: "public",
  input: emailInput,
  handler: async ({ input }): Promise<NeutralResult> => {
    const email = input.email.trim().toLowerCase();
    return svcReset(email, await ip(), (work) => after(work));
  },
});

export const resendVerificationAction = defineAction({
  roles: "public",
  input: emailInput,
  handler: async ({ input }): Promise<NeutralResult> => {
    const email = input.email.trim().toLowerCase();
    return svcResend(email, await ip(), (work) => after(work));
  },
});

export const verifyEmailAction = defineAction({
  roles: "public",
  input: tokenInput,
  handler: ({ input }) => svcVerify(input.token),
});

export const resetPasswordAction = defineAction({
  roles: "public",
  input: passwordInput,
  handler: ({ input }): Promise<ConsumeResult> =>
    resetWithToken(input.token, input.password, "auth.password_reset"),
});

export const setPasswordAction = defineAction({
  roles: "public",
  input: passwordInput,
  handler: ({ input }): Promise<ConsumeResult> =>
    resetWithToken(input.token, input.password, "auth.password_set"),
});
