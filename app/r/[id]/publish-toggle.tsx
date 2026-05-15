"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { togglePublish } from "./actions";

export function PublishToggle({
  requestId,
  published,
}: {
  requestId: string;
  published: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await togglePublish(requestId, !published);
      if (!res.ok) setError(res.error ?? "Failed");
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={published ? "outline" : "default"}
        onClick={onClick}
        disabled={pending}
      >
        {pending
          ? "…"
          : published
            ? "Unpublish"
            : "Publish to library"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
