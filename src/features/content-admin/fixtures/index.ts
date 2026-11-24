/** Fixture adapter for the demo slice — server pages import this. */
import { world } from "../../_shared/fixtures/world";
export const contentAdminFixture = () => ({
  events: world.events,
  announcements: world.announcements,
  opportunities: world.opportunities,
  stories: world.stories,
  featured: world.alumni.filter((a) => a.isFeatured),
  candidates: world.alumni.filter(
    (a) => a.verifyStatus === "verified" && !a.isFeatured,
  ),
});
