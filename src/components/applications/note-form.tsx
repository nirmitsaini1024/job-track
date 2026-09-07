"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addNoteAction } from "@/actions/applications";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function NoteForm({ applicationId }: { applicationId: string }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await addNoteAction({ applicationId, note });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          setNote("");
          toast.success("Note added");
        });
      }}
    >
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note about this application…"
        rows={4}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || !note.trim()}>
          {pending ? "Saving…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}
