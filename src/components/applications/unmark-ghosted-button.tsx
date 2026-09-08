"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { unmarkGhostedApplicationAction } from "@/actions/applications";
import { Button } from "@/components/ui/button";

export function UnmarkGhostedButton({
  applicationId,
  size = "sm",
  variant = "outline",
  label = "Unmark ghosted",
}: {
  applicationId: string;
  size?: "sm" | "default";
  variant?: "outline" | "ghost";
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={pending}
      className={variant === "ghost" ? "h-auto px-0 py-0 text-xs" : undefined}
      title="Clear ghosted and treat as active again"
      onClick={() => {
        startTransition(async () => {
          const result = await unmarkGhostedApplicationAction({
            id: applicationId,
          });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Unmarked as ghosted");
        });
      }}
    >
      {pending ? "Unmarking…" : label}
    </Button>
  );
}
