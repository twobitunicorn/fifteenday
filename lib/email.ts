import { Resend } from "resend";

let cached: Resend | null = null;

function getResend(): Resend | null {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  cached = new Resend(apiKey);
  return cached;
}

export type SendArgs = {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
  headers?: Record<string, string>;
};

export type SendResult = {
  resendId: string;
  messageIdHeader: string;
};

export async function sendRequestEmail(args: SendArgs): Promise<SendResult> {
  const resend = getResend();
  if (!resend) {
    throw new Error(
      "RESEND_API_KEY is not configured; cannot send. Set it in .env.local.",
    );
  }

  const result = await resend.emails.send({
    from: args.from,
    to: args.to,
    replyTo: args.replyTo,
    subject: args.subject,
    text: args.text,
    headers: args.headers,
  });

  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }

  if (!result.data) {
    throw new Error("Resend send returned no data");
  }

  return {
    resendId: result.data.id,
    // Resend assigns its own Message-ID. The id we get back is the Resend-side id;
    // the actual RFC822 Message-ID needs to be fetched separately or derived.
    // For now we use the resend id as a stable reference.
    messageIdHeader: `<${result.data.id}@resend>`,
  };
}
