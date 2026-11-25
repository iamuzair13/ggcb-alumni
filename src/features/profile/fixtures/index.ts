/** Fixture adapter for the demo slice — server pages import this. */
import { world } from "../../_shared/fixtures/world";
export const profileFixture = (id: string) => ({
  me: world.alumni.find((a) => a.id === id),
  requests: world.changeRequests.filter((r) => r.alumniId === id),
});
