import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const requestStatus = pgEnum("request_status", [
  "draft",
  "sent",
  "acknowledged",
  "clarification_needed",
  "fee_quoted",
  "fulfilled",
  "denied",
  "withdrawn",
]);

export const messageDirection = pgEnum("message_direction", [
  "outbound",
  "inbound",
]);

export const reviewStatus = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected",
]);

export const requesters = pgTable("requesters", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const custodians = pgTable("custodians", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  agency: text("agency").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  email: text("email").notNull(),
  address: text("address"),
  publicRecordsUrl: text("public_records_url"),
  notes: text("notes"),
  source: text("source"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const requests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => requesters.id, { onDelete: "restrict" }),
    custodianId: uuid("custodian_id")
      .notNull()
      .references(() => custodians.id, { onDelete: "restrict" }),
    intent: jsonb("intent").notNull(),
    draftText: text("draft_text").notNull(),
    finalText: text("final_text"),
    status: requestStatus("status").notNull().default("draft"),
    replyAlias: text("reply_alias").notNull().unique(),
    feeWaiverRequested: boolean("fee_waiver_requested")
      .notNull()
      .default(false),
    publicInterestRationale: text("public_interest_rationale"),
    published: boolean("published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    searchTsv: text("search_tsv"),
  },
  (t) => [
    index("requests_status_idx").on(t.status),
    index("requests_published_idx").on(t.published),
    index("requests_custodian_idx").on(t.custodianId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    direction: messageDirection("direction").notNull(),
    fromEmail: text("from_email").notNull(),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    bodyText: text("body_text"),
    bodyHtml: text("body_html"),
    messageIdHeader: text("message_id_header"),
    inReplyToHeader: text("in_reply_to_header"),
    raw: jsonb("raw"),
    resendId: text("resend_id"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("messages_request_idx").on(t.requestId),
    index("messages_msgid_idx").on(t.messageIdHeader),
    index("messages_inreplyto_idx").on(t.inReplyToHeader),
  ],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    blobUrl: text("blob_url").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    bytes: bigint("bytes", { mode: "number" }).notNull(),
    extractedText: text("extracted_text"),
    reviewStatus: reviewStatus("review_status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("attachments_message_idx").on(t.messageId),
    index("attachments_review_idx").on(t.reviewStatus),
  ],
);

export const statusEvents = pgTable(
  "status_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    oldStatus: requestStatus("old_status"),
    newStatus: requestStatus("new_status").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("status_events_request_idx").on(t.requestId)],
);

export type Requester = typeof requesters.$inferSelect;
export type Custodian = typeof custodians.$inferSelect;
export type Request = typeof requests.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type StatusEvent = typeof statusEvents.$inferSelect;
