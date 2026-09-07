import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const applicationStatusEnum = pgEnum("application_status", [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
]);

export const remoteTypeEnum = pgEnum("remote_type", [
  "REMOTE",
  "HYBRID",
  "ONSITE",
  "UNKNOWN",
]);

export const salaryPeriodEnum = pgEnum("salary_period", [
  "YEAR",
  "MONTH",
  "HOUR",
  "UNKNOWN",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "APPLICATION_CREATED",
  "STATUS_CHANGED",
  "EMAIL_RECEIVED",
  "INTERVIEW",
  "OFFER",
  "REJECTION",
  "NOTE_ADDED",
]);

export const communicationTypeEnum = pgEnum("communication_type", [
  "EMAIL",
  "NOTE",
  "OTHER",
]);

export const emailClassificationEnum = pgEnum("email_classification", [
  "REJECTED",
  "INTERVIEW",
  "SCREENING",
  "OFFER",
  "OTHER",
]);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Reserved for future multi-user ownership without a schema rewrite.
    ownerId: text("owner_id"),
    company: text("company").notNull(),
    position: text("position").notNull(),
    location: text("location"),
    remoteType: remoteTypeEnum("remote_type").notNull().default("UNKNOWN"),
    employmentType: text("employment_type"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"),
    salaryPeriod: salaryPeriodEnum("salary_period"),
    experienceMin: integer("experience_min"),
    experienceMax: integer("experience_max"),
    description: text("description").notNull().default(""),
    applicationUrl: text("application_url"),
    source: text("source"),
    status: applicationStatusEnum("status").notNull().default("SAVED"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("applications_status_idx").on(table.status),
    index("applications_applied_at_idx").on(table.appliedAt),
    index("applications_last_activity_at_idx").on(table.lastActivityAt),
    index("applications_company_idx").on(table.company),
    index("applications_position_idx").on(table.position),
    index("applications_location_idx").on(table.location),
    index("applications_source_idx").on(table.source),
    index("applications_remote_type_idx").on(table.remoteType),
    index("applications_owner_id_idx").on(table.ownerId),
    index("applications_created_at_idx").on(table.createdAt),
  ],
);

export const applicationSkills = pgTable(
  "application_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    skill: text("skill").notNull(),
  },
  (table) => [
    index("application_skills_application_id_idx").on(table.applicationId),
    index("application_skills_skill_idx").on(table.skill),
    uniqueIndex("application_skills_unique_idx").on(
      table.applicationId,
      table.skill,
    ),
  ],
);

export const applicationEvents = pgTable(
  "application_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    type: eventTypeEnum("type").notNull(),
    description: text("description").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("application_events_application_id_idx").on(table.applicationId),
    index("application_events_created_at_idx").on(table.createdAt),
    index("application_events_type_idx").on(table.type),
  ],
);

export const communications = pgTable(
  "communications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    type: communicationTypeEnum("type").notNull().default("EMAIL"),
    content: text("content").notNull(),
    aiClassification: emailClassificationEnum("ai_classification"),
    aiConfidence: integer("ai_confidence"),
    aiSummary: text("ai_summary"),
    aiReasoning: text("ai_reasoning"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("communications_application_id_idx").on(table.applicationId),
    index("communications_created_at_idx").on(table.createdAt),
  ],
);

export const applicationsRelations = relations(applications, ({ many }) => ({
  skills: many(applicationSkills),
  events: many(applicationEvents),
  communications: many(communications),
}));

export const applicationSkillsRelations = relations(
  applicationSkills,
  ({ one }) => ({
    application: one(applications, {
      fields: [applicationSkills.applicationId],
      references: [applications.id],
    }),
  }),
);

export const applicationEventsRelations = relations(
  applicationEvents,
  ({ one }) => ({
    application: one(applications, {
      fields: [applicationEvents.applicationId],
      references: [applications.id],
    }),
  }),
);

export const communicationsRelations = relations(communications, ({ one }) => ({
  application: one(applications, {
    fields: [communications.applicationId],
    references: [applications.id],
  }),
}));

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type ApplicationSkill = typeof applicationSkills.$inferSelect;
export type ApplicationEvent = typeof applicationEvents.$inferSelect;
export type Communication = typeof communications.$inferSelect;

export type ApplicationStatus = (typeof applicationStatusEnum.enumValues)[number];
export type RemoteType = (typeof remoteTypeEnum.enumValues)[number];
export type SalaryPeriod = (typeof salaryPeriodEnum.enumValues)[number];
export type EventType = (typeof eventTypeEnum.enumValues)[number];
export type EmailClassification =
  (typeof emailClassificationEnum.enumValues)[number];
