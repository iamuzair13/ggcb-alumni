import type { AdminEvent } from "./types";

export interface EventsPort {
  list(filter: "upcoming" | "past" | "all"): AdminEvent[];
  save(event: AdminEvent): AdminEvent;
  remove(id: string): void;
}
