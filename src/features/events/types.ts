/** Events — context.md §4.7. */
import type { EventType } from "@/lib/constants/statuses";

export interface AdminEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  startsAt: string; // ISO date
  endsAt: string | null;
  venue: string;
  imagePath: string | null;
  isPublished: boolean;
}

export type { EventType };
