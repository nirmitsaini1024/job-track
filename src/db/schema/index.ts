import {
  boolean,
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

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_username_idx").on(table.username),
    index("users_created_at_idx").on(table.createdAt),
  ],
);

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resumeData: text("resume_data"),
    bestProjects: text("best_projects"),
    proudProject: text("proud_project"),
    projectLinks: text("project_links"),
    hardestProject: text("hardest_project"),
    programmingInspiration: text("programming_inspiration"),
    rejectionPitch: text("rejection_pitch"),
    questionnaireContext: jsonb("questionnaire_context")
      .$type<Array<{ question: string; answer: string }>>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_profiles_user_id_idx").on(table.userId),
    index("user_profiles_created_at_idx").on(table.createdAt),
  ],
);

export const questionnaireQuestions = pgTable(
  "questionnaire_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    question: text("question").notNull(),
    normalizedKey: text("normalized_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("questionnaire_questions_normalized_key_idx").on(
      table.normalizedKey,
    ),
    index("questionnaire_questions_created_at_idx").on(table.createdAt),
  ],
);

export const userQuestionnaireItems = pgTable(
  "user_questionnaire_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questionnaireQuestions.id, { onDelete: "cascade" }),
    answer: text("answer").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_questionnaire_items_user_question_idx").on(
      table.userId,
      table.questionId,
    ),
    index("user_questionnaire_items_user_id_idx").on(table.userId),
    index("user_questionnaire_items_question_id_idx").on(table.questionId),
  ],
);

export const userQuestionnaireDismissals = pgTable(
  "user_questionnaire_dismissals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questionnaireQuestions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_questionnaire_dismissals_user_question_idx").on(
      table.userId,
      table.questionId,
    ),
    index("user_questionnaire_dismissals_user_id_idx").on(table.userId),
    index("user_questionnaire_dismissals_question_id_idx").on(table.questionId),
  ],
);

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

export const recommendationStatusEnum = pgEnum("recommendation_status", [
  "PENDING",
  "DISMISSED",
  "CONVERTED",
]);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
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
    questionAnswers: jsonb("question_answers")
      .$type<Array<{ question: string; answer: string }>>()
      .notNull()
      .default([]),
    status: applicationStatusEnum("status").notNull().default("SAVED"),
    ghosted: boolean("ghosted").notNull().default(false),
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

export const applicationAttachments = pgTable(
  "application_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    fileId: text("file_id").notNull(),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("application_attachments_application_id_idx").on(table.applicationId),
    index("application_attachments_created_at_idx").on(table.createdAt),
  ],
);

export const jobRecommendations = pgTable(
  "job_recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceApplicationId: uuid("source_application_id").references(
      () => applications.id,
      { onDelete: "set null" },
    ),
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
    applicationUrl: text("application_url").notNull(),
    source: text("source"),
    note: text("note"),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    status: recommendationStatusEnum("status").notNull().default("PENDING"),
    convertedApplicationId: uuid("converted_application_id").references(
      () => applications.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("job_recommendations_to_user_id_idx").on(table.toUserId),
    index("job_recommendations_from_user_id_idx").on(table.fromUserId),
    index("job_recommendations_status_idx").on(table.status),
    index("job_recommendations_to_user_status_idx").on(
      table.toUserId,
      table.status,
    ),
    index("job_recommendations_application_url_idx").on(table.applicationUrl),
  ],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  applications: many(applications),
  questionnaireItems: many(userQuestionnaireItems),
  questionnaireDismissals: many(userQuestionnaireDismissals),
  recommendationsSent: many(jobRecommendations, {
    relationName: "recommendations_sent",
  }),
  recommendationsReceived: many(jobRecommendations, {
    relationName: "recommendations_received",
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const questionnaireQuestionsRelations = relations(
  questionnaireQuestions,
  ({ many }) => ({
    userItems: many(userQuestionnaireItems),
  }),
);

export const userQuestionnaireItemsRelations = relations(
  userQuestionnaireItems,
  ({ one }) => ({
    user: one(users, {
      fields: [userQuestionnaireItems.userId],
      references: [users.id],
    }),
    question: one(questionnaireQuestions, {
      fields: [userQuestionnaireItems.questionId],
      references: [questionnaireQuestions.id],
    }),
  }),
);

export const userQuestionnaireDismissalsRelations = relations(
  userQuestionnaireDismissals,
  ({ one }) => ({
    user: one(users, {
      fields: [userQuestionnaireDismissals.userId],
      references: [users.id],
    }),
    question: one(questionnaireQuestions, {
      fields: [userQuestionnaireDismissals.questionId],
      references: [questionnaireQuestions.id],
    }),
  }),
);

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  owner: one(users, {
    fields: [applications.ownerId],
    references: [users.id],
  }),
  skills: many(applicationSkills),
  events: many(applicationEvents),
  communications: many(communications),
  attachments: many(applicationAttachments),
}));

export const applicationAttachmentsRelations = relations(
  applicationAttachments,
  ({ one }) => ({
    application: one(applications, {
      fields: [applicationAttachments.applicationId],
      references: [applications.id],
    }),
  }),
);

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

export const jobRecommendationsRelations = relations(
  jobRecommendations,
  ({ one }) => ({
    fromUser: one(users, {
      fields: [jobRecommendations.fromUserId],
      references: [users.id],
      relationName: "recommendations_sent",
    }),
    toUser: one(users, {
      fields: [jobRecommendations.toUserId],
      references: [users.id],
      relationName: "recommendations_received",
    }),
    sourceApplication: one(applications, {
      fields: [jobRecommendations.sourceApplicationId],
      references: [applications.id],
      relationName: "recommendation_source",
    }),
    convertedApplication: one(applications, {
      fields: [jobRecommendations.convertedApplicationId],
      references: [applications.id],
      relationName: "recommendation_converted",
    }),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type QuestionnaireQuestion = typeof questionnaireQuestions.$inferSelect;
export type UserQuestionnaireItem = typeof userQuestionnaireItems.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type ApplicationSkill = typeof applicationSkills.$inferSelect;
export type ApplicationEvent = typeof applicationEvents.$inferSelect;
export type Communication = typeof communications.$inferSelect;
export type ApplicationAttachment = typeof applicationAttachments.$inferSelect;
export type JobRecommendation = typeof jobRecommendations.$inferSelect;

export type ApplicationStatus = (typeof applicationStatusEnum.enumValues)[number];
export type RemoteType = (typeof remoteTypeEnum.enumValues)[number];
export type SalaryPeriod = (typeof salaryPeriodEnum.enumValues)[number];
export type EventType = (typeof eventTypeEnum.enumValues)[number];
export type EmailClassification =
  (typeof emailClassificationEnum.enumValues)[number];
export type RecommendationStatus =
  (typeof recommendationStatusEnum.enumValues)[number];
