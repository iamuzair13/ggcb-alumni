import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  ChevronRight,
  Inbox,
  Info,
  MoreHorizontal,
  Search,
  TriangleAlert,
} from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToastDemo } from "./toast-demo";
import { PasswordFieldDemo, RowActionsDemo } from "./patterns-demo";
import { InlineAlert } from "@/components/shared/inline-alert";
import { UserStatusBadge } from "@/components/shared/user-status-badge";
import { EcardArtifact } from "@/components/shared/ecard-artifact";
import { LedgerRule } from "@/components/shared/ledger-rule";
import { ParagraphText } from "@/components/shared/paragraph-text";
import {
  CalendarDemo,
  ChartsDemo,
  DisplayBitsDemo,
  DropZoneDemo,
  StepperDemo,
} from "./phase6-demo";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id} className="font-heading text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Demo({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

type AlumniRow = {
  id: number;
  name: string;
  roll: string;
  dept: string;
  year: number;
  status: "verified" | "under_approval" | "rejected";
};

const tableRows: AlumniRow[] = [
  {
    id: 1,
    name: "Sample Alumni A",
    roll: "Roll number",
    dept: "Computer Science",
    year: 2023,
    status: "verified",
  },
  {
    id: 2,
    name: "Sample Alumni B",
    roll: "Roll number",
    dept: "English",
    year: 2023,
    status: "under_approval",
  },
  {
    id: 3,
    name: "Sample Alumni C",
    roll: "Roll number",
    dept: "Mathematics",
    year: 2024,
    status: "rejected",
  },
];

const tableColumns: DataTableColumn<AlumniRow>[] = [
  { key: "name", header: "Name", cell: (r) => r.name },
  {
    key: "roll",
    header: "Roll No.",
    cell: (r) => <span className="font-mono text-xs">{r.roll}</span>,
  },
  { key: "dept", header: "Department", cell: (r) => r.dept },
  {
    key: "year",
    header: "Year",
    className: "tnum text-right",
    cell: (r) => r.year,
  },
  {
    key: "status",
    header: "Status",
    cell: (r) => <StatusBadge status={r.status} />,
  },
];

export default function DesignPage() {
  // Dev-only showcase — hard 404 in any production build.
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <TooltipProvider>
      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <PageHeader
          title="Design system"
          description="Every shared primitive and its states. Development only."
          breadcrumb={
            <p className="font-mono text-xs text-muted-foreground">/design</p>
          }
        />

        {/* Colour tokens */}
        <Section id="colours" title="Colour tokens">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["Primary", "bg-primary", "text-primary-foreground"],
                ["Secondary", "bg-secondary", "text-secondary-foreground"],
                ["Muted", "bg-muted", "text-muted-foreground"],
                ["Accent", "bg-accent", "text-accent-foreground"],
                ["Success", "bg-success", "text-success-foreground"],
                ["Warning", "bg-warning", "text-warning-foreground"],
                ["Info", "bg-info", "text-info-foreground"],
                [
                  "Destructive",
                  "bg-destructive",
                  "text-destructive-foreground",
                ],
              ] as const
            ).map(([label, bg, fg]) => (
              <div
                key={label}
                className={`flex h-16 items-end rounded-lg border p-2 ${bg} ${fg}`}
              >
                <span className="text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-foreground">Foreground — body text.</p>
            <p className="text-muted-foreground">
              Muted foreground — supporting text.
            </p>
            <p className="text-primary">Primary — links and emphasis.</p>
            <p className="text-destructive">Destructive — errors.</p>
          </div>
        </Section>

        {/* Typography */}
        <Section id="typography" title="Typography">
          <div className="space-y-3">
            <h1 className="font-heading text-4xl font-semibold tracking-tight">
              Heading 1 — Source Serif 4
            </h1>
            <h2 className="font-heading text-3xl font-semibold tracking-tight">
              Heading 2 — Source Serif 4
            </h2>
            <h3 className="font-heading text-2xl font-semibold tracking-tight">
              Heading 3
            </h3>
            <h4 className="font-heading text-xl font-semibold tracking-tight">
              Heading 4
            </h4>
            <p className="max-w-prose text-base leading-relaxed text-pretty">
              Body text in Public Sans at 16&nbsp;px. Alumni records, events,
              and college news all read in this voice — clear on small phones,
              calm on large screens.
            </p>
            <p className="text-sm text-muted-foreground">
              Small / muted — captions, hints, secondary information.
            </p>
            <p className="font-mono text-sm">
              Mono — identifiers (roll numbers, card numbers)
            </p>
            <p className="tnum text-sm">
              Tabular numbers — 1,024 · 9,876 · 12,345
            </p>
          </div>
        </Section>

        {/* Buttons */}
        <Section id="buttons" title="Button">
          <Demo>
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="destructiveSolid">Destructive solid</Button>
            <Button variant="link">Link</Button>
          </Demo>
          <Demo>
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="More actions">
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </Demo>
          <Demo>
            <Button loading>Saving…</Button>
            <Button disabled>Disabled</Button>
            <Button variant="outline" loading>
              Loading outline
            </Button>
          </Demo>
          <Demo>
            <Button>
              Continue
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </Demo>
        </Section>

        {/* Form controls */}
        <Section id="forms" title="Form controls">
          <div className="grid max-w-xl gap-5">
            <FormField
              label="Email"
              required
              hint="Used for sign-in and college notices."
            >
              {(id, describedBy) => (
                <Input
                  id={id}
                  type="email"
                  placeholder="you@example.com…"
                  aria-describedby={describedBy}
                />
              )}
            </FormField>
            <FormField
              label="Roll number"
              error="This roll number is already registered."
            >
              {(id, describedBy) => (
                <Input
                  id={id}
                  aria-invalid="true"
                  aria-describedby={describedBy}
                  defaultValue="Roll number"
                />
              )}
            </FormField>
            <FormField label="Disabled input">
              {(id) => <Input id={id} disabled placeholder="Not editable…" />}
            </FormField>
            <FormField label="Department">
              {(id) => (
                <Select>
                  <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder="Choose a department…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Departments</SelectLabel>
                      <SelectItem value="cs">Computer Science</SelectItem>
                      <SelectItem value="eng">English</SelectItem>
                      <SelectItem value="math">Mathematics</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField label="Bio" hint="A few lines for the alumni directory.">
              {(id, describedBy) => (
                <Textarea
                  id={id}
                  rows={3}
                  placeholder="Tell fellow alumni what you do…"
                  aria-describedby={describedBy}
                />
              )}
            </FormField>
            {/* Base UI choice controls render a <span role=…> — not a
                labellable element, so <label htmlFor> cannot name it.
                Name the control with aria-labelledby pointing at its
                text instead. This is THE pattern for real forms too. */}
            <div className="flex items-center gap-3">
              <Checkbox id="mentor" aria-labelledby="mentor-label" />
              <span id="mentor-label" className="text-sm">
                Available to mentor juniors
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="mentor-checked"
                defaultChecked
                aria-labelledby="mentor-checked-label"
              />
              <span id="mentor-checked-label" className="text-sm">
                Checked state
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="mentor-disabled"
                disabled
                aria-labelledby="mentor-disabled-label"
              />
              <span
                id="mentor-disabled-label"
                className="text-sm text-muted-foreground"
              >
                Disabled
              </span>
            </div>
            <RadioGroup
              defaultValue="list"
              className="grid gap-2"
              aria-label="Directory visibility"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem
                  value="list"
                  id="r1"
                  aria-labelledby="r1-label"
                />
                <span id="r1-label" className="text-sm">
                  Show in directory
                </span>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem
                  value="hide"
                  id="r2"
                  aria-labelledby="r2-label"
                />
                <span id="r2-label" className="text-sm">
                  Hide from directory
                </span>
              </div>
            </RadioGroup>
            <div className="flex items-center gap-3">
              <Switch
                id="profile-visible"
                defaultChecked
                aria-labelledby="profile-visible-label"
              />
              <span id="profile-visible-label" className="text-sm">
                Profile visible
              </span>
            </div>
          </div>
        </Section>

        {/* Badges */}
        <Section id="badges" title="Badge & status chip">
          <Demo>
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <StatusBadge status="verified" />
            <StatusBadge status="under_approval" />
            <StatusBadge status="rejected" />
            <Badge className="bg-info text-info-foreground">Info</Badge>
          </Demo>
        </Section>

        {/* Card */}
        <Section id="cards" title="Card">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile completeness</CardTitle>
                <CardDescription>
                  Keep your alumni record up to date.
                </CardDescription>
                <CardAction>
                  <Badge variant="secondary">60%</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Add your employer and a profile photo to complete your record.
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline">
                  Update profile
                </Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Plain card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Cards carry related content with a hairline border — no
                  decorative shadows.
                </p>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Overlays */}
        <Section id="overlays" title="Overlays">
          <Demo>
            {/* Base UI `render` prop: children live on the rendered element
                itself, not on the Trigger. */}
            <Dialog>
              <DialogTrigger
                render={<Button variant="outline">Open dialog</Button>}
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve registration?</DialogTitle>
                  <DialogDescription>
                    The alumnus will be marked verified and an E-card will be
                    issued automatically.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Approve</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="destructive">Delete record</Button>}
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this record?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the row. This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    render={<Button variant="destructiveSolid" />}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Sheet>
              <SheetTrigger
                render={<Button variant="outline">Open sheet</Button>}
              />
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Narrow the alumni list by department and year.
                  </SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline">Row actions</Button>}
              />
              <DropdownMenuContent>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>View profile</DropdownMenuItem>
                <DropdownMenuItem>Approve</DropdownMenuItem>
                <DropdownMenuItem>Reject…</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger
                render={<Button variant="outline">Hover for tooltip</Button>}
              />
              <TooltipContent>Helpful, short context.</TooltipContent>
            </Tooltip>
          </Demo>

          <Tabs defaultValue="verified" className="max-w-md">
            <TabsList>
              <TabsTrigger value="verified">Verified</TabsTrigger>
              <TabsTrigger value="pending">Under approval</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            <TabsContent
              value="verified"
              className="pt-3 text-sm text-muted-foreground"
            >
              Verified alumni appear in the directory and hold an E-card.
            </TabsContent>
            <TabsContent
              value="pending"
              className="pt-3 text-sm text-muted-foreground"
            >
              Registrations awaiting staff review.
            </TabsContent>
            <TabsContent
              value="rejected"
              className="pt-3 text-sm text-muted-foreground"
            >
              Rejected registrations, with reason recorded.
            </TabsContent>
          </Tabs>
        </Section>

        {/* Feedback */}
        <Section id="feedback" title="Feedback">
          <div className="grid max-w-2xl gap-4">
            <Alert>
              <Info aria-hidden="true" />
              <AlertTitle>Registration received</AlertTitle>
              <AlertDescription>
                Your registration is under review by college staff.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>
                Row 42 has a duplicate roll number. Fix the file and re-upload.
              </AlertDescription>
            </Alert>
            <Alert className="border-warning bg-warning text-warning-foreground">
              <TriangleAlert aria-hidden="true" />
              <AlertTitle>Session ending soon</AlertTitle>
              <AlertDescription>
                Sign in again to keep working without losing changes.
              </AlertDescription>
            </Alert>
          </div>
          <Demo>
            <ToastDemo />
          </Demo>
          <Demo>
            <Spinner />
            <Spinner className="size-6" />
            <Button variant="outline" loading>
              Submitting
            </Button>
          </Demo>
          <div className="grid max-w-md gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="max-w-md">
            <EmptyState
              icon={Inbox}
              title="No announcements yet"
              description="Published announcements will appear here. Check back soon."
              action={
                <Button size="sm" variant="outline">
                  Refresh
                </Button>
              }
            />
          </div>
        </Section>

        {/* Data display */}
        <Section id="data" title="Data display">
          <Demo>
            <Avatar>
              <AvatarImage src="" alt="Sample alumnus" />
              <AvatarFallback>SA</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>GG</AvatarFallback>
            </Avatar>
          </Demo>

          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/alumni">Alumni</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Detail</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>
                  2
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          <div>
            <h3 className="mb-2 text-sm font-medium">DataTable (responsive)</h3>
            <DataTable
              columns={tableColumns}
              rows={tableRows}
              caption="Sample rows — illustrative data only."
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">Raw Table</h3>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableCaption>Departments (sample)</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Alumni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs">CS</TableCell>
                    <TableCell>Computer Science</TableCell>
                    <TableCell className="tnum text-right">412</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">ENG</TableCell>
                    <TableCell>English</TableCell>
                    <TableCell className="tnum text-right">389</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bell className="size-4" aria-hidden="true" />
            <span>
              Icon discipline: lucide only, aria-hidden when decorative.
            </span>
            <Search className="size-4" aria-hidden="true" />
            <ChevronRight className="size-4" aria-hidden="true" />
          </div>
        </Section>

        {/* Phase 5 composite patterns */}
        <Section id="patterns" title="Patterns (Phase 5)">
          <div className="grid max-w-2xl gap-4">
            <InlineAlert variant="info" title="InlineAlert — info">
              Non-blocking context that stays on screen until the user acts.
            </InlineAlert>
            <InlineAlert variant="success" title="InlineAlert — success">
              Confirmation that needs to persist (not a toast).
            </InlineAlert>
            <InlineAlert variant="warning" title="InlineAlert — warning">
              Degraded capability (for example email not configured).
            </InlineAlert>
            <InlineAlert variant="destructive" title="InlineAlert — error">
              Something went wrong — say what happened and how to recover.
            </InlineAlert>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">
              PasswordField — toggle + live policy hint
            </h3>
            <PasswordFieldDemo />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">
              UserStatusBadge — staff user status chips
            </h3>
            <Demo>
              <UserStatusBadge status="active" />
              <UserStatusBadge status="invited" />
              <UserStatusBadge status="inactive" />
            </Demo>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">
              RowActions + ConfirmDialog — labelled menu, explicit verbs
            </h3>
            <RowActionsDemo />
          </div>

          <p className="max-w-prose text-sm text-muted-foreground">
            List-page composites live in{" "}
            <code className="font-mono text-xs">components/shared</code>:{" "}
            <code className="font-mono text-xs">ListToolbar</code> (URL-bound
            search + filters + chips),{" "}
            <code className="font-mono text-xs">Pager</code> (&quot;Showing x–y
            of n&quot; + prev/next links),{" "}
            <code className="font-mono text-xs">FormDialog</code> (quick
            create/edit with server field errors). Their live demos are the
            screens themselves:{" "}
            <code className="font-mono text-xs">/admin/users</code>,{" "}
            <code className="font-mono text-xs">/admin/departments</code>, and
            the fixture previews under{" "}
            <code className="font-mono text-xs">/design/screens/*</code>.
          </p>
        </Section>

        {/* Phase 6 — the "college ledger" direction */}
        <Section id="ledger" title="Ledger motif & E-card (Phase 6)">
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-medium">
                LedgerRule — the signature section divider
              </h3>
              <LedgerRule />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">
                EcardArtifact — the crafted card (active / revoked / unissued)
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <EcardArtifact
                  name="Sample Ayesha Khan"
                  department="Sample Computer Science"
                  session="2019–2023"
                  cardNo="GGCB-EC-000001"
                  rollNumber="GG-2019-0001"
                  status="active"
                />
                <EcardArtifact
                  name="Sample Bilal Qureshi"
                  department="Sample Mathematics"
                  session="2020–2024"
                  cardNo="GGCB-EC-000002"
                  status="revoked"
                />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">
                ParagraphText — plain-text → paragraphs (never HTML)
              </h3>
              <ParagraphText
                className="max-w-prose rounded-lg border bg-card p-4 text-sm text-muted-foreground"
                text={
                  "First paragraph of a story.\n\nSecond paragraph, kept as plain text. No markup is ever rendered."
                }
              />
            </div>
          </div>
        </Section>

        <Section id="charts" title="Charts, calendar, stepper (Phase 6)">
          <p className="max-w-prose text-sm text-muted-foreground">
            Hand-built SVG charts — no dependency. Every chart has a tooltip,
            focusable points, an sr-only summary and a “View as table” toggle.
          </p>
          <ChartsDemo />
          <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
            <StepperDemo />
            <CalendarDemo />
          </div>
          <DropZoneDemo />
          <DisplayBitsDemo />
        </Section>
      </main>
    </TooltipProvider>
  );
}
