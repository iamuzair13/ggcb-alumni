import type { Story, StoryStatus } from "./types";

export interface StoriesPort {
  mine(alumniId: string): Story[];
  published(): Story[];
  submit(input: {
    alumniId: string;
    title: string;
    content: string;
    imageAlt?: string;
  }): Story;
  review(id: string, decision: "approve" | "reject", note?: string): void;
  listByStatus(status?: StoryStatus): Story[];
}
