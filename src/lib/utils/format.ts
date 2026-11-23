/**
 * Shared formatters. Always use Intl.* — never hand-rolled date/number
 * strings (locale safety, see web-design-guidelines review).
 */

const dateFormatter = new Intl.DateTimeFormat("en-PK", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-PK", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(date: Date | string): string {
  return dateFormatter.format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return dateTimeFormatter.format(new Date(date));
}
