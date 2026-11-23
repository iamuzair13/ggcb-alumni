import "server-only";
/**
 * Cosmetic nav filtering — hides links the role cannot use. The guards are
 * still the control; this only removes dead affordances from the UI.
 */
import { ADMIN_NAV_ITEMS, type NavItem } from "@/lib/constants/navigation";
import { policyFor } from "./route-policy";
import type { Role } from "@/lib/constants/roles";

export function adminNavForRole(role: Role): NavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => {
    const policy = policyFor(item.href);
    if (!policy || policy.roles === "public" || policy.roles === "any") {
      return true;
    }
    return policy.roles.includes(role);
  });
}
