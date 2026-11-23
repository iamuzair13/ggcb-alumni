import { useId } from "react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

/**
 * Form field wrapper: label (+ required marker), control, optional hint,
 * and error text wired with aria-describedby/aria-invalid.
 *
 * Usage:
 *   <FormField label="Email" required error={errors.email} hint="We never share it.">
 *     {(id, describedBy) => <Input id={id} aria-describedby={describedBy} aria-invalid={!!errors.email} />}
 *   </FormField>
 */
export function FormField({
  label,
  required = false,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <Field className={className} data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
      </FieldLabel>
      <FieldContent>
        {children(id, describedBy)}
        {hint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
        {error ? (
          <FieldError id={errorId} role="alert">
            {error}
          </FieldError>
        ) : null}
      </FieldContent>
    </Field>
  );
}
