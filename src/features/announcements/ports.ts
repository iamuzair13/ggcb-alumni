import type { Announcement } from "./types";

export interface AnnouncementsPort {
  list(): Announcement[];
  save(item: Announcement): Announcement;
  remove(id: string): void;
}
