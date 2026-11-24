/** Content admin VM — the four tabs + featured manager (context.md §4.6-4.7). */
import type { Alumnus } from "@/features/alumni-directory/types";

export interface FeaturedEntry {
  alumniId: string;
  name: string;
  department: string;
  achievement: string;
  order: number;
}

export interface FeaturedManagerData {
  featured: FeaturedEntry[];
  candidates: Alumnus[]; // verified, not featured
}
