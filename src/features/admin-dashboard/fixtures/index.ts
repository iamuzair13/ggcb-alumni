/** Fixture adapter for the demo slice — server pages import this. */
import { world } from "../../_shared/fixtures/world";
export const adminDashboardFixture = () => ({
  alumni: world.alumni,
  ecards: world.ecards,
  changeRequests: world.changeRequests,
});
