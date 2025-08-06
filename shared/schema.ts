import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  jsonb,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Tenants (Business organizations) - Comprehensive company onboarding
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Legal and business details
  legalName: varchar("legal_name", { length: 255 }).notNull(),
  brandName: varchar("brand_name", { length: 255 }).notNull(),
  slogan: varchar("slogan", { length: 255 }),
  industry: varchar("industry", { length: 100 }).notNull(), // Selected from dropdown
  businessNature: text("business_nature"), // Detailed description
  
  // Primary contact information
  primaryContactName: varchar("primary_contact_name", { length: 255 }).notNull(),
  primaryContactEmail: varchar("primary_contact_email", { length: 255 }).notNull(),
  primaryContactPhone: varchar("primary_contact_phone", { length: 50 }),
  primaryContactPosition: varchar("primary_contact_position", { length: 100 }),
  
  // Business address
  businessAddress: text("business_address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  
  // Digital presence
  websiteUrl: varchar("website_url", { length: 255 }),
  socialMediaLinks: jsonb("social_media_links").$type<{
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  }>(),
  
  // Branding
  logoUrl: varchar("logo_url", { length: 500 }),
  brandColors: jsonb("brand_colors").$type<{
    background1: string;
    background2: string;
    text1: string;
    text2: string;
    primary: string;
    secondary: string;
  }>(),
  
  // Access management
  authorizedEmails: text("authorized_emails").array(),
  
  // System fields
  subscription: varchar("subscription", { length: 50 }).default("free"),
  isActive: boolean("is_active").default(true),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Users (Business users who manage the platform)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  role: varchar("role", { length: 50 }).default("admin"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Locations (Branches, stores, hospitals, etc.)
export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  zipCode: varchar("zip_code", { length: 20 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  managerId: uuid("manager_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Survey templates (Industry-specific form templates)
export const surveyTemplates = pgTable("survey_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  industry: varchar("industry", { length: 100 }).notNull(),
  fields: jsonb("fields").notNull(), // Stores field definitions as JSON
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// QR Codes for tables/beds/locations
export const qrCodes = pgTable("qr_codes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  identifier: varchar("identifier", { length: 100 }).notNull(), // Table 12, Bed 3, etc.
  section: varchar("section", { length: 100 }), // Patio, VIP, ICU, etc.
  qrData: text("qr_data").notNull(), // Encoded QR data
  qrImageUrl: varchar("qr_image_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Feedback responses
export const feedbackResponses = pgTable("feedback_responses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  qrCodeId: uuid("qr_code_id").references(() => qrCodes.id),
  customerName: varchar("customer_name", { length: 255 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  overallRating: integer("overall_rating").notNull(),
  feedbackText: text("feedback_text"),
  customFields: jsonb("custom_fields"), // Dynamic custom field responses
  voiceRecordingUrl: varchar("voice_recording_url", { length: 500 }),
  imageUrls: jsonb("image_urls"), // Array of image URLs
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  responseTime: integer("response_time"), // Time taken to complete in seconds
  isPublic: boolean("is_public").default(false),
  tags: jsonb("tags"), // Array of tags for categorization
  sentiment: varchar("sentiment", { length: 50 }), // positive, negative, neutral
  sentimentScore: decimal("sentiment_score", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// QR Code analytics
export const qrAnalytics = pgTable("qr_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  qrCodeId: uuid("qr_code_id").references(() => qrCodes.id).notNull(),
  scannedAt: timestamp("scanned_at").defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  completedFeedback: boolean("completed_feedback").default(false),
  feedbackId: uuid("feedback_id").references(() => feedbackResponses.id),
});

// Alert rules
export const alertRules = pgTable("alert_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  conditions: jsonb("conditions").notNull(), // Rule conditions
  actions: jsonb("actions").notNull(), // What to do when triggered
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Alert notifications
export const alertNotifications = pgTable("alert_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  alertRuleId: uuid("alert_rule_id").references(() => alertRules.id).notNull(),
  feedbackId: uuid("feedback_id").references(() => feedbackResponses.id),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  severity: varchar("severity", { length: 50 }).notNull(), // critical, warning, info
  isRead: boolean("is_read").default(false),
  isAcknowledged: boolean("is_acknowledged").default(false),
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Multimedia files table for voice recordings and images
export const multimediaFiles = pgTable("multimedia_files", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  feedbackId: uuid("feedback_id").references(() => feedbackResponses.id),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(), // voice, image
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  originalFileName: varchar("original_file_name", { length: 255 }),
  uploadStatus: varchar("upload_status", { length: 50 }).default("pending"), // pending, completed, failed
  isPublic: boolean("is_public").default(false),
  isDeleted: boolean("is_deleted").default(false), // soft delete
  deletedAt: timestamp("deleted_at"),
  expiresAt: timestamp("expires_at"), // for temporary files
  metadata: jsonb("metadata"), // additional file metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_multimedia_files_tenant_id").on(table.tenantId),
  index("IDX_multimedia_files_feedback_id").on(table.feedbackId),
  index("IDX_multimedia_files_file_type").on(table.fileType),
  index("IDX_multimedia_files_upload_status").on(table.uploadStatus),
  index("IDX_multimedia_files_created_at").on(table.createdAt),
  index("IDX_multimedia_files_tenant_type").on(table.tenantId, table.fileType),
]);

// Define relations
export const tenantRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  locations: many(locations),
  surveyTemplates: many(surveyTemplates),
  qrCodes: many(qrCodes),
  feedbackResponses: many(feedbackResponses),
  alertRules: many(alertRules),
  multimediaFiles: many(multimediaFiles),
}));

export const userRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
}));

export const locationRelations = relations(locations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [locations.tenantId],
    references: [tenants.id],
  }),
  manager: one(users, {
    fields: [locations.managerId],
    references: [users.id],
  }),
  qrCodes: many(qrCodes),
  feedbackResponses: many(feedbackResponses),
}));

export const qrCodeRelations = relations(qrCodes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [qrCodes.tenantId],
    references: [tenants.id],
  }),
  location: one(locations, {
    fields: [qrCodes.locationId],
    references: [locations.id],
  }),
  feedbackResponses: many(feedbackResponses),
  analytics: many(qrAnalytics),
}));

export const feedbackResponseRelations = relations(feedbackResponses, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [feedbackResponses.tenantId],
    references: [tenants.id],
  }),
  location: one(locations, {
    fields: [feedbackResponses.locationId],
    references: [locations.id],
  }),
  qrCode: one(qrCodes, {
    fields: [feedbackResponses.qrCodeId],
    references: [qrCodes.id],
  }),
  multimediaFiles: many(multimediaFiles),
}));

export const surveyTemplateRelations = relations(surveyTemplates, ({ one }) => ({
  tenant: one(tenants, {
    fields: [surveyTemplates.tenantId],
    references: [tenants.id],
  }),
}));

export const alertRuleRelations = relations(alertRules, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [alertRules.tenantId],
    references: [tenants.id],
  }),
  notifications: many(alertNotifications),
}));

export const alertNotificationRelations = relations(alertNotifications, ({ one }) => ({
  tenant: one(tenants, {
    fields: [alertNotifications.tenantId],
    references: [tenants.id],
  }),
  alertRule: one(alertRules, {
    fields: [alertNotifications.alertRuleId],
    references: [alertRules.id],
  }),
  feedback: one(feedbackResponses, {
    fields: [alertNotifications.feedbackId],
    references: [feedbackResponses.id],
  }),
  acknowledgedUser: one(users, {
    fields: [alertNotifications.acknowledgedBy],
    references: [users.id],
  }),
  qrCode: one(qrCodes, {
    fields: [feedbackResponses.qrCodeId],
    references: [qrCodes.id],
  }),
}));

export const multimediaFileRelations = relations(multimediaFiles, ({ one }) => ({
  tenant: one(tenants, {
    fields: [multimediaFiles.tenantId],
    references: [tenants.id],
  }),
  feedback: one(feedbackResponses, {
    fields: [multimediaFiles.feedbackId],
    references: [feedbackResponses.id],
  }),
}));

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSurveyTemplateSchema = createInsertSchema(surveyTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQrCodeSchema = createInsertSchema(qrCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFeedbackResponseSchema = createInsertSchema(feedbackResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAlertRuleSchema = createInsertSchema(alertRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAlertNotificationSchema = createInsertSchema(alertNotifications).omit({
  id: true,
  createdAt: true,
});

export const insertMultimediaFileSchema = createInsertSchema(multimediaFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type SurveyTemplate = typeof surveyTemplates.$inferSelect;
export type InsertSurveyTemplate = z.infer<typeof insertSurveyTemplateSchema>;

export type QrCode = typeof qrCodes.$inferSelect;
export type InsertQrCode = z.infer<typeof insertQrCodeSchema>;

export type FeedbackResponse = typeof feedbackResponses.$inferSelect;
export type InsertFeedbackResponse = z.infer<typeof insertFeedbackResponseSchema>;

export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = z.infer<typeof insertAlertRuleSchema>;

export type AlertNotification = typeof alertNotifications.$inferSelect;
export type InsertAlertNotification = z.infer<typeof insertAlertNotificationSchema>;

export type MultimediaFile = typeof multimediaFiles.$inferSelect;
export type InsertMultimediaFile = z.infer<typeof insertMultimediaFileSchema>;

export type QrAnalytic = typeof qrAnalytics.$inferSelect;
