import { notFound } from "next/navigation";
import { DemoIndex } from "./index-view";

export default function DemoIndexPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DemoIndex />;
}
