import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-xl border bg-card p-10 text-center">
      <h1 className="text-lg font-medium">Application not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        It may have been removed, or the link is invalid.
      </p>
      <Link href="/applications" className="mt-4 inline-block text-sm underline">
        Back to applications
      </Link>
    </div>
  );
}
