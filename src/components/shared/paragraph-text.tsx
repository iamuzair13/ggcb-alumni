/**
 * Plain-text body renderer for user/staff-authored content (stories,
 * announcements, bios). Splits on blank lines into <p> elements — never
 * HTML, never markdown, never dangerouslySetInnerHTML.
 */
export function ParagraphText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className={className}>
      {paragraphs.map((p, i) => (
        <p key={i} className="leading-relaxed [&:not(:first-child)]:mt-3">
          {p.split("\n").map((line, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {line}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
