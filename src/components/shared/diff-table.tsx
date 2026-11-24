/** Old-vs-new diff table for change-request review. */
import type { ChangeField } from "@/features/alumni-directory/types";

export function DiffTable({ changes }: { changes: ChangeField[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-medium">
              Field
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Current
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Requested
            </th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr key={c.field} className="border-b last:border-0">
              <th scope="row" className="px-3 py-2 text-left font-medium">
                {c.label}
              </th>
              <td className="px-3 py-2 text-muted-foreground line-through decoration-destructive/50">
                {c.oldValue}
              </td>
              <td className="px-3 py-2 font-medium">{c.newValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
