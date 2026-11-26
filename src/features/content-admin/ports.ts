import type { FeaturedManagerData } from "./types";

export interface FeaturedPort {
  load(): FeaturedManagerData;
  feature(alumniId: string, achievement: string): void;
  unfeature(alumniId: string): void;
  reorder(ids: string[]): void;
}
