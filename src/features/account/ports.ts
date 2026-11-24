import type { AccountInfo } from "./types";

export interface AccountPort {
  info(): AccountInfo;
  changePassword(input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ ok: true } | { ok: false; message: string }>;
  signOutEverywhere(): Promise<{ ok: true }>;
}
