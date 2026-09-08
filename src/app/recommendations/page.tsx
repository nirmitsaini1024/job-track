import { requireSession } from "@/lib/auth";
import { listPendingRecommendationsForUser } from "@/db/queries/recommendations";
import { RecommendationsFeed } from "@/components/recommendations/recommendations-feed";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const session = await requireSession();

  let items: Awaited<ReturnType<typeof listPendingRecommendationsForUser>> = [];
  let error: string | null = null;

  try {
    items = await listPendingRecommendationsForUser(session.userId);
  } catch (err) {
    error =
      err instanceof Error && err.message.includes("DATABASE_URL")
        ? "Add DATABASE_URL to .env, then run npm run db:migrate."
        : "Unable to load recommendations. If this is new, run npm run db:migrate.";
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Recommendations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jobs others recommended for you. Save or apply to track them, or
          remove them from this feed.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          {error}
        </div>
      ) : (
        <RecommendationsFeed items={items} />
      )}
    </div>
  );
}
