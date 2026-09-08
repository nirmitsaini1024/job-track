"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  deleteApplicationAttachmentAction,
  uploadApplicationAttachmentsAction,
} from "@/actions/attachments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_APPLICATION_ATTACHMENTS,
  MAX_IMAGE_BYTES,
} from "@/lib/constants";
import type { SerializedAttachment } from "@/db/queries/attachments";

function validateImage(file: File): string | null {
  if (
    !ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
    )
  ) {
    return "Use JPEG, PNG, WebP, or GIF images.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Each image must be 5MB or smaller.";
  }
  return null;
}

export function ApplicationScreenshots({
  applicationId,
  initialAttachments,
}: {
  applicationId: string;
  initialAttachments: SerializedAttachment[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  async function uploadFiles(files: File[]) {
    const valid: File[] = [];
    for (const file of files) {
      const error = validateImage(file);
      if (error) {
        toast.error(error);
        continue;
      }
      valid.push(file);
    }
    if (!valid.length) return;

    if (attachments.length + valid.length > MAX_APPLICATION_ATTACHMENTS) {
      toast.error(
        `You can store up to ${MAX_APPLICATION_ATTACHMENTS} screenshots per application.`,
      );
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.set("applicationId", applicationId);
    for (const file of valid) {
      form.append("images", file);
    }
    const result = await uploadApplicationAttachmentsAction(form);
    setUploading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(
      result.data.uploaded === 1
        ? "Screenshot saved"
        : `${result.data.uploaded} screenshots saved`,
    );
    window.location.reload();
  }

  async function onPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (!files.length) return;
    event.preventDefault();
    await uploadFiles(files);
  }

  async function removeAttachment(id: string) {
    const result = await deleteApplicationAttachmentAction({ id });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setAttachments((current) => current.filter((item) => item.id !== id));
    toast.success("Screenshot removed");
  }

  function openViewer(index: number) {
    setActiveIndex(index);
    setViewerOpen(true);
  }

  const active = attachments[activeIndex] ?? null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Screenshots</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Paste or upload images to store with this application (
              {attachments.length}/{MAX_APPLICATION_ATTACHMENTS}).
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-3.5" />
            {uploading ? "Uploading…" : "Upload"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={(event) => {
              void uploadFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </CardHeader>
        <CardContent>
          <div
            tabIndex={0}
            onPaste={onPaste}
            className="rounded-md border border-dashed p-4 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No screenshots yet. Click Upload or paste an image here
                (Ctrl/Cmd+V).
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {attachments.map((item, index) => (
                  <div key={item.id} className="group relative overflow-hidden rounded-md border">
                    <button
                      type="button"
                      className="block w-full"
                      onClick={() => openViewer(index)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.name}
                        className="aspect-video w-full object-cover"
                      />
                    </button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="secondary"
                      className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeAttachment(item.id)}
                      aria-label="Delete screenshot"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {active?.name ?? "Screenshot"}{" "}
              {attachments.length > 1
                ? `(${activeIndex + 1}/${attachments.length})`
                : null}
            </DialogTitle>
          </DialogHeader>
          {active ? (
            <div className="grid gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.url}
                alt={active.name}
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
              {attachments.length > 1 ? (
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActiveIndex(
                        (current) =>
                          (current - 1 + attachments.length) %
                          attachments.length,
                      )
                    }
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActiveIndex(
                        (current) => (current + 1) % attachments.length,
                      )
                    }
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
