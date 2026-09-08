import { notFound } from "next/navigation";
import { ApplicationDetail } from "@/components/applications/application-detail";
import { getApplication } from "@/db/queries/applications";
import { requireSession } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) notFound();

  let application: Awaited<ReturnType<typeof getApplication>> | null = null;
  let error: string | null = null;
  try {
    application = await getApplication(parsed.data, session.userId);
  } catch (err) {
    error =
      err instanceof Error && err.message.includes("DATABASE_URL")
        ? "Add DATABASE_URL to .env.local, then run npm run db:push."
        : "Unable to load this application.";
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (!application) notFound();
  return <ApplicationDetail application={application} />;
}
