/** Success stories — context.md §4.6. */
export type StoryStatus = "pending" | "approved" | "rejected";

export interface Story {
  id: string;
  alumniId: string;
  alumniName: string;
  title: string;
  content: string; // plain text — rendered as paragraphs, never HTML
  imagePath: string | null;
  status: StoryStatus;
  reviewNote: string | null;
  createdAt: string;
}
