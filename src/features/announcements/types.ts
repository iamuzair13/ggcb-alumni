/** Announcements — context.md §4.7. */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  attachmentPath: string | null;
  publishAt: string;
  expiresAt: string | null;
  isPinned: boolean;
  isPublished: boolean;
}
