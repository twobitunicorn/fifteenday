"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/drizzle/schema";
import { reviewAttachment } from "./actions";

export function AttachmentReview({
  attachmentId,
  reviewStatus,
}: {
  attachmentId: string;
  reviewStatus: Attachment["reviewStatus"];
}) {
  const [pending, startTransition] = useTransition();

  function set(next: Attachment["reviewStatus"]) {
    startTransition(() => {
      reviewAttachment(attachmentId, next);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="xs"
        variant={reviewStatus === "approved" ? "default" : "outline"}
        onClick={() => set("approved")}
        disabled={pending}
      >
        Approve
      </Button>
      <Button
        size="xs"
        variant={reviewStatus === "rejected" ? "destructive" : "outline"}
        onClick={() => set("rejected")}
        disabled={pending}
      >
        Reject
      </Button>
      <Button
        size="xs"
        variant={reviewStatus === "pending" ? "default" : "outline"}
        onClick={() => set("pending")}
        disabled={pending}
      >
        Hold
      </Button>
    </div>
  );
}
