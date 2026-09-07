"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteApplicationAction } from "@/actions/applications";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteApplicationButton({
  applicationId,
  company,
  position,
  redirectTo,
  variant = "ghost",
  size = "icon-sm",
  label,
}: {
  applicationId: string;
  company: string;
  position: string;
  redirectTo?: string;
  variant?: "ghost" | "outline" | "destructive";
  size?: "icon-sm" | "sm" | "default";
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await deleteApplicationAction({ id: applicationId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Application deleted");
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={variant}
            size={size}
            aria-label={`Delete ${company} application`}
          />
        }
      >
        <Trash2 className="size-4" />
        {label ? <span>{label}</span> : null}
      </DialogTrigger>
      <DialogContent showCloseButton={!pending} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete application?</DialogTitle>
          <DialogDescription>
            This permanently removes{" "}
            <span className="font-medium text-foreground">
              {position} at {company}
            </span>
            , including timeline events, communications, and notes. This cannot
            be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
