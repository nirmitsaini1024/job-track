"use client";

import { useState } from "react";
import { toast } from "sonner";
import { analyseGhostedApplicationsAction } from "@/actions/applications";

export function AnalyseNavButton() {
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    const result = await analyseGhostedApplicationsAction();
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (result.data.marked === 0) {
      toast.message(
        `No applications older than ${result.data.thresholdDays} days to mark as ghosted`,
      );
      return;
    }

    toast.success(
      `Marked ${result.data.marked} application${result.data.marked === 1 ? "" : "s"} as ghosted (${result.data.thresholdDays}+ days inactive)`,
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={run}
      title="Mark applications with no activity for 10+ days as ghosted"
      className="inline-flex h-7 items-center rounded-md border border-primary bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      {pending ? "Analysing…" : "Analyse"}
    </button>
  );
}
