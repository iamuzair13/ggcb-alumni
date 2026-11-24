import type {
  Alumnus,
  AlumniChangeRequest,
} from "@/features/alumni-directory/types";
import type { ChangeRequestDraft, EditableProfile } from "./types";

export interface ProfilePort {
  me(): Alumnus;
  update(patch: EditableProfile): Alumnus;
  requestChange(draft: ChangeRequestDraft): AlumniChangeRequest;
  myRequests(): AlumniChangeRequest[];
  withdrawRequest(id: string): void;
}
