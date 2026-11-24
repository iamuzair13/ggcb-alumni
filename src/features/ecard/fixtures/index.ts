/** Fixture adapter for the demo slice — server pages import this. */
import { world } from "../../_shared/fixtures/world";
export const ecardFixture = (id: string) => ({
  me: world.alumni.find((a) => a.id === id),
  card: world.ecards.find((c) => c.alumniId === id),
});
