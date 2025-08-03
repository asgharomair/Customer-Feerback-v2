import {
  tenants,
  users,
  locations,
  surveyTemplates,
  qrCodes,
  feedbackResponses,
  alertRules,
  alertNotifications,
  qrAnalytics,
  type Tenant,
  type InsertTenant,
  type User,
  type InsertUser,
  type Location,
  type InsertLocation,
  type SurveyTemplate,
  type InsertSurveyTemplate,
  type QrCode,
  type InsertQrCode,
  type FeedbackResponse,
  type InsertFeedbackResponse,
  type AlertRule,
  type InsertAlertRule,
  type AlertNotification,
  type InsertAlertNotification,
  type QrAnalytic,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, avg, sql } from "drizzle-orm";

export interface IStorage {
  // Tenant operations
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant>;

  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  getUsersByTenant(tenantId: string): Promise<User[]>;

  // Location operations
  getLocation(id: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location>;
  getLocationsByTenant(tenantId: string): Promise<Location[]>;

  // Survey Template operations
  getSurveyTemplate(id: string): Promise<SurveyTemplate | undefined>;
  createSurveyTemplate(template: InsertSurveyTemplate): Promise<SurveyTemplate>;
  updateSurveyTemplate(id: string, template: Partial<InsertSurveyTemplate>): Promise<SurveyTemplate>;
  getSurveyTemplatesByTenant(tenantId: string): Promise<SurveyTemplate[]>;

  // QR Code operations
  getQrCode(id: string): Promise<QrCode | undefined>;
  createQrCode(qrCode: InsertQrCode): Promise<QrCode>;
  updateQrCode(id: string, qrCode: Partial<InsertQrCode>): Promise<QrCode>;
  getQrCodesByTenant(tenantId: string): Promise<QrCode[]>;
  getQrCodesByLocation(locationId: string): Promise<QrCode[]>;

  // Feedback operations
  getFeedbackResponse(id: string): Promise<FeedbackResponse | undefined>;
  createFeedbackResponse(feedback: InsertFeedbackResponse): Promise<FeedbackResponse>;
  updateFeedbackResponse(id: string, feedback: Partial<InsertFeedbackResponse>): Promise<FeedbackResponse>;
  getFeedbackResponsesByTenant(tenantId: string, limit?: number): Promise<FeedbackResponse[]>;
  getFeedbackResponsesByLocation(locationId: string, limit?: number): Promise<FeedbackResponse[]>;

  // Analytics operations
  getTenantMetrics(tenantId: string): Promise<{
    averageRating: number;
    totalResponses: number;
    criticalAlerts: number;
    qrScansToday: number;
  }>;
  getFeedbackTrends(tenantId: string, days: number): Promise<Array<{
    date: string;
    averageRating: number;
    responseCount: number;
  }>>;

  // Alert operations
  getAlertRule(id: string): Promise<AlertRule | undefined>;
  createAlertRule(rule: InsertAlertRule): Promise<AlertRule>;
  updateAlertRule(id: string, rule: Partial<InsertAlertRule>): Promise<AlertRule>;
  getAlertRulesByTenant(tenantId: string): Promise<AlertRule[]>;

  getAlertNotification(id: string): Promise<AlertNotification | undefined>;
  createAlertNotification(notification: InsertAlertNotification): Promise<AlertNotification>;
  updateAlertNotification(id: string, notification: Partial<InsertAlertNotification>): Promise<AlertNotification>;
  getAlertNotificationsByTenant(tenantId: string, limit?: number): Promise<AlertNotification[]>;

  // QR Analytics operations
  trackQrScan(qrCodeId: string, tenantId: string, ipAddress?: string, userAgent?: string): Promise<void>;
  getQrAnalytics(qrCodeId: string, days?: number): Promise<QrAnalytic[]>;
}

export class DatabaseStorage implements IStorage {
  // Tenant operations
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant> {
    const [updatedTenant] = await db
      .update(tenants)
      .set({ ...tenant, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updatedTenant;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  // Location operations
  async getLocation(id: string): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [newLocation] = await db.insert(locations).values(location).returning();
    return newLocation;
  }

  async updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location> {
    const [updatedLocation] = await db
      .update(locations)
      .set({ ...location, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();
    return updatedLocation;
  }

  async getLocationsByTenant(tenantId: string): Promise<Location[]> {
    return await db.select().from(locations).where(eq(locations.tenantId, tenantId));
  }

  // Survey Template operations
  async getSurveyTemplate(id: string): Promise<SurveyTemplate | undefined> {
    const [template] = await db.select().from(surveyTemplates).where(eq(surveyTemplates.id, id));
    return template;
  }

  async createSurveyTemplate(template: InsertSurveyTemplate): Promise<SurveyTemplate> {
    const [newTemplate] = await db.insert(surveyTemplates).values(template).returning();
    return newTemplate;
  }

  async updateSurveyTemplate(id: string, template: Partial<InsertSurveyTemplate>): Promise<SurveyTemplate> {
    const [updatedTemplate] = await db
      .update(surveyTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(surveyTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async getSurveyTemplatesByTenant(tenantId: string): Promise<SurveyTemplate[]> {
    return await db.select().from(surveyTemplates).where(eq(surveyTemplates.tenantId, tenantId));
  }

  // QR Code operations
  async getQrCode(id: string): Promise<QrCode | undefined> {
    const [qrCode] = await db.select().from(qrCodes).where(eq(qrCodes.id, id));
    return qrCode;
  }

  async createQrCode(qrCode: InsertQrCode): Promise<QrCode> {
    const [newQrCode] = await db.insert(qrCodes).values(qrCode).returning();
    return newQrCode;
  }

  async updateQrCode(id: string, qrCode: Partial<InsertQrCode>): Promise<QrCode> {
    const [updatedQrCode] = await db
      .update(qrCodes)
      .set({ ...qrCode, updatedAt: new Date() })
      .where(eq(qrCodes.id, id))
      .returning();
    return updatedQrCode;
  }

  async getQrCodesByTenant(tenantId: string): Promise<QrCode[]> {
    return await db.select().from(qrCodes).where(eq(qrCodes.tenantId, tenantId));
  }

  async getQrCodesByLocation(locationId: string): Promise<QrCode[]> {
    return await db.select().from(qrCodes).where(eq(qrCodes.locationId, locationId));
  }

  // Feedback operations
  async getFeedbackResponse(id: string): Promise<FeedbackResponse | undefined> {
    const [feedback] = await db.select().from(feedbackResponses).where(eq(feedbackResponses.id, id));
    return feedback;
  }

  async createFeedbackResponse(feedback: InsertFeedbackResponse): Promise<FeedbackResponse> {
    const [newFeedback] = await db.insert(feedbackResponses).values(feedback).returning();
    return newFeedback;
  }

  async updateFeedbackResponse(id: string, feedback: Partial<InsertFeedbackResponse>): Promise<FeedbackResponse> {
    const [updatedFeedback] = await db
      .update(feedbackResponses)
      .set({ ...feedback, updatedAt: new Date() })
      .where(eq(feedbackResponses.id, id))
      .returning();
    return updatedFeedback;
  }

  async getFeedbackResponsesByTenant(tenantId: string, limit = 50): Promise<FeedbackResponse[]> {
    return await db
      .select()
      .from(feedbackResponses)
      .where(eq(feedbackResponses.tenantId, tenantId))
      .orderBy(desc(feedbackResponses.createdAt))
      .limit(limit);
  }

  async getFeedbackResponsesByLocation(locationId: string, limit = 50): Promise<FeedbackResponse[]> {
    return await db
      .select()
      .from(feedbackResponses)
      .where(eq(feedbackResponses.locationId, locationId))
      .orderBy(desc(feedbackResponses.createdAt))
      .limit(limit);
  }

  // Analytics operations
  async getTenantMetrics(tenantId: string): Promise<{
    averageRating: number;
    totalResponses: number;
    criticalAlerts: number;
    qrScansToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [avgRating] = await db
      .select({ avg: avg(feedbackResponses.overallRating) })
      .from(feedbackResponses)
      .where(eq(feedbackResponses.tenantId, tenantId));

    const [totalResponses] = await db
      .select({ count: count() })
      .from(feedbackResponses)
      .where(eq(feedbackResponses.tenantId, tenantId));

    const [criticalAlerts] = await db
      .select({ count: count() })
      .from(alertNotifications)
      .where(
        and(
          eq(alertNotifications.tenantId, tenantId),
          eq(alertNotifications.severity, "critical"),
          eq(alertNotifications.isRead, false)
        )
      );

    const [qrScansToday] = await db
      .select({ count: count() })
      .from(qrAnalytics)
      .where(
        and(
          eq(qrAnalytics.tenantId, tenantId),
          sql`${qrAnalytics.scannedAt} >= ${today}`
        )
      );

    return {
      averageRating: Number(avgRating.avg || 0),
      totalResponses: totalResponses.count,
      criticalAlerts: criticalAlerts.count,
      qrScansToday: qrScansToday.count,
    };
  }

  async getFeedbackTrends(tenantId: string, days = 7): Promise<Array<{
    date: string;
    averageRating: number;
    responseCount: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await db
      .select({
        date: sql<string>`DATE(${feedbackResponses.createdAt})`,
        averageRating: avg(feedbackResponses.overallRating),
        responseCount: count(),
      })
      .from(feedbackResponses)
      .where(
        and(
          eq(feedbackResponses.tenantId, tenantId),
          sql`${feedbackResponses.createdAt} >= ${startDate}`
        )
      )
      .groupBy(sql`DATE(${feedbackResponses.createdAt})`)
      .orderBy(sql`DATE(${feedbackResponses.createdAt})`);

    return trends.map(trend => ({
      date: trend.date,
      averageRating: Number(trend.averageRating || 0),
      responseCount: trend.responseCount,
    }));
  }

  // Alert operations
  async getAlertRule(id: string): Promise<AlertRule | undefined> {
    const [rule] = await db.select().from(alertRules).where(eq(alertRules.id, id));
    return rule;
  }

  async createAlertRule(rule: InsertAlertRule): Promise<AlertRule> {
    const [newRule] = await db.insert(alertRules).values(rule).returning();
    return newRule;
  }

  async updateAlertRule(id: string, rule: Partial<InsertAlertRule>): Promise<AlertRule> {
    const [updatedRule] = await db
      .update(alertRules)
      .set({ ...rule, updatedAt: new Date() })
      .where(eq(alertRules.id, id))
      .returning();
    return updatedRule;
  }

  async getAlertRulesByTenant(tenantId: string): Promise<AlertRule[]> {
    return await db.select().from(alertRules).where(eq(alertRules.tenantId, tenantId));
  }

  async getAlertNotification(id: string): Promise<AlertNotification | undefined> {
    const [notification] = await db.select().from(alertNotifications).where(eq(alertNotifications.id, id));
    return notification;
  }

  async createAlertNotification(notification: InsertAlertNotification): Promise<AlertNotification> {
    const [newNotification] = await db.insert(alertNotifications).values(notification).returning();
    return newNotification;
  }

  async updateAlertNotification(id: string, notification: Partial<InsertAlertNotification>): Promise<AlertNotification> {
    const [updatedNotification] = await db
      .update(alertNotifications)
      .set(notification)
      .where(eq(alertNotifications.id, id))
      .returning();
    return updatedNotification;
  }

  async getAlertNotificationsByTenant(tenantId: string, limit = 10): Promise<AlertNotification[]> {
    return await db
      .select()
      .from(alertNotifications)
      .where(eq(alertNotifications.tenantId, tenantId))
      .orderBy(desc(alertNotifications.createdAt))
      .limit(limit);
  }

  // QR Analytics operations
  async trackQrScan(qrCodeId: string, tenantId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await db.insert(qrAnalytics).values({
      qrCodeId,
      tenantId,
      ipAddress,
      userAgent,
    });
  }

  async getQrAnalytics(qrCodeId: string, days = 30): Promise<QrAnalytic[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await db
      .select()
      .from(qrAnalytics)
      .where(
        and(
          eq(qrAnalytics.qrCodeId, qrCodeId),
          sql`${qrAnalytics.scannedAt} >= ${startDate}`
        )
      )
      .orderBy(desc(qrAnalytics.scannedAt));
  }
}

export const storage = new DatabaseStorage();
