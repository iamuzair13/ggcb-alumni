import "server-only";
/**
 * Cosmetic nav filtering — hides links the role cannot use. The guards are
 * still the control; this only removes dead affordances from the UI.
 */
import { ADMIN_NAV_ITEMS } from "@/lib/constants/navigation";
import { policyFor } from "./route-policy";
import type { Role } from "@/lib/constants/roles";

/**
 * Returns the nav hrefs a role may see (serializable — icons are
 * component references and cannot cross the RSC→client boundary, so the
 * client components resolve full items from ADMIN_NAV_ITEMS themselves).
 */
export function adminNavForRole(role: Role): string[] {
  return ADMIN_NAV_ITEMS.filter((item) => {
    const policy = policyFor(item.href);
    if (!policy || policy.roles === "public" || policy.roles === "any") {
      return true;
    }
    return policy.roles.includes(role);
  }).map((item) => item.href);
}
