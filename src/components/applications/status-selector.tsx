"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateApplicationStatusAction } from "@/actions/applications";
import { APPLICATION_STATUSES, STATUS_LABELS } from "@/lib/constants";
import type { ApplicationStatus } from "@/db/schema";
import { nativeSelectClassName } from "@/lib/select-styles";
import { cn } from "@/lib/utils";

export function StatusSelector({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(status);

  return (
    <select
      className={cn(nativeSelectClassName, "w-auto")}
      value={value}
      disabled={pending}
      onChange={(event) => {
        const next = event.target.value as ApplicationStatus;
        setValue(next);
        startTransition(async () => {
          const result = await updateApplicationStatusAction({
            id: applicationId,
            status: next,
          });
          if (!result.ok) {
            setValue(status);
            toast.error(result.error);
            return;
          }
          toast.success(`Status updated to ${STATUS_LABELS[next]}`);
        });
      }}
    >
      {APPLICATION_STATUSES.map((item) => (
        <option key={item} value={item}>
          {STATUS_LABELS[item]}
        </option>
      ))}
    </select>
  );
}
