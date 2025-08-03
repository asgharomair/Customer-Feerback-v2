import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertFeedbackResponseSchema, insertQrCodeSchema, insertLocationSchema, insertSurveyTemplateSchema, insertAlertRuleSchema } from "@shared/schema";
import QRCode from "qrcode";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time features
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws, req) => {
    const clientId = randomUUID();
    clients.set(clientId, ws);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'auth' && data.tenantId) {
          // Associate client with tenant for targeted notifications
          ws.tenantId = data.tenantId;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
    });
  });

  // Broadcast alert to all connected clients of a tenant
  function broadcastAlert(tenantId: string, alert: any) {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.tenantId === tenantId) {
        client.send(JSON.stringify({
          type: 'alert',
          data: alert
        }));
      }
    });
  }

  // Demo tenant creation endpoint (in production, this would be part of registration flow)
  app.post('/api/tenants', async (req, res) => {
    try {
      const tenant = await storage.createTenant(req.body);
      
      // Create default location
      const defaultLocation = await storage.createLocation({
        tenantId: tenant.id,
        name: "Main Location",
        address: "123 Main St",
        city: "Anytown",
        state: "State",
        zipCode: "12345",
        isActive: true
      });

      // Create default survey template
      await storage.createSurveyTemplate({
        tenantId: tenant.id,
        name: "Default Feedback Survey",
        description: "Standard customer feedback form",
        industry: tenant.industry,
        fields: [
          { id: 'customer_name', type: 'text', label: 'Your Name', required: true },
          { id: 'customer_email', type: 'email', label: 'Email (Optional)', required: false },
          { id: 'overall_rating', type: 'rating', label: 'Overall Rating', required: true, max: 5 },
          { id: 'feedback_text', type: 'textarea', label: 'Your Feedback', required: false }
        ],
        isDefault: true,
        isActive: true
      });

      res.json(tenant);
    } catch (error) {
      console.error('Error creating tenant:', error);
      res.status(500).json({ error: 'Failed to create tenant' });
    }
  });

  // Get tenant with locations and metrics
  app.get('/api/tenants/:id', async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const locations = await storage.getLocationsByTenant(tenant.id);
      const metrics = await storage.getTenantMetrics(tenant.id);

      res.json({
        ...tenant,
        locations,
        metrics
      });
    } catch (error) {
      console.error('Error fetching tenant:', error);
      res.status(500).json({ error: 'Failed to fetch tenant' });
    }
  });

  // Analytics endpoints
  app.get('/api/analytics/metrics/:tenantId', async (req, res) => {
    try {
      const metrics = await storage.getTenantMetrics(req.params.tenantId);
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  app.get('/api/analytics/trends/:tenantId', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const trends = await storage.getFeedbackTrends(req.params.tenantId, days);
      res.json(trends);
    } catch (error) {
      console.error('Error fetching trends:', error);
      res.status(500).json({ error: 'Failed to fetch trends' });
    }
  });

  // Feedback endpoints
  app.get('/api/feedback/:tenantId', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const feedback = await storage.getFeedbackResponsesByTenant(req.params.tenantId, limit);
      res.json(feedback);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      res.status(500).json({ error: 'Failed to fetch feedback' });
    }
  });

  app.post('/api/feedback', async (req, res) => {
    try {
      const validatedData = insertFeedbackResponseSchema.parse(req.body);
      const feedback = await storage.createFeedbackResponse(validatedData);

      // Check for alert conditions and trigger if necessary
      if (feedback.overallRating <= 2) {
        const alert = await storage.createAlertNotification({
          tenantId: feedback.tenantId,
          alertRuleId: '', // In production, this would reference actual alert rules
          feedbackId: feedback.id,
          title: 'Low Rating Alert',
          message: `Customer gave a rating of ${feedback.overallRating}/5 for ${feedback.qrCodeId ? 'QR location' : 'general feedback'}`,
          severity: 'critical'
        });

        // Broadcast real-time alert
        broadcastAlert(feedback.tenantId, alert);
      }

      res.json(feedback);
    } catch (error) {
      console.error('Error creating feedback:', error);
      res.status(500).json({ error: 'Failed to create feedback' });
    }
  });

  // QR Code endpoints
  app.get('/api/qr-codes/:tenantId', async (req, res) => {
    try {
      const qrCodes = await storage.getQrCodesByTenant(req.params.tenantId);
      
      // Enhance with analytics data
      const enhancedQrCodes = await Promise.all(
        qrCodes.map(async (qr) => {
          const analytics = await storage.getQrAnalytics(qr.id, 1); // Today's scans
          const allAnalytics = await storage.getQrAnalytics(qr.id, 30); // Last 30 days
          
          return {
            ...qr,
            scansToday: analytics.length,
            totalScans: allAnalytics.length,
            completionRate: allAnalytics.length > 0 ? 
              Math.round((allAnalytics.filter(a => a.completedFeedback).length / allAnalytics.length) * 100) : 0
          };
        })
      );

      res.json(enhancedQrCodes);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      res.status(500).json({ error: 'Failed to fetch QR codes' });
    }
  });

  app.post('/api/qr-codes', async (req, res) => {
    try {
      const { tenantId, locationId, identifier, section } = req.body;
      
      // Generate QR data URL
      const qrData = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/feedback?t=${tenantId}&l=${locationId}&q=${randomUUID()}`;
      
      // Generate QR code image
      const qrImageData = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const qrCode = await storage.createQrCode({
        tenantId,
        locationId,
        identifier,
        section,
        qrData,
        qrImageUrl: qrImageData, // In production, this would be uploaded to object storage
        isActive: true
      });

      res.json(qrCode);
    } catch (error) {
      console.error('Error creating QR code:', error);
      res.status(500).json({ error: 'Failed to create QR code' });
    }
  });

  // Track QR code scan
  app.post('/api/qr-codes/:id/scan', async (req, res) => {
    try {
      const qrCode = await storage.getQrCode(req.params.id);
      if (!qrCode) {
        return res.status(404).json({ error: 'QR code not found' });
      }

      await storage.trackQrScan(
        qrCode.id,
        qrCode.tenantId,
        req.ip,
        req.get('User-Agent')
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking QR scan:', error);
      res.status(500).json({ error: 'Failed to track QR scan' });
    }
  });

  // Location endpoints
  app.get('/api/locations/:tenantId', async (req, res) => {
    try {
      const locations = await storage.getLocationsByTenant(req.params.tenantId);
      res.json(locations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ error: 'Failed to fetch locations' });
    }
  });

  app.post('/api/locations', async (req, res) => {
    try {
      const validatedData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(validatedData);
      res.json(location);
    } catch (error) {
      console.error('Error creating location:', error);
      res.status(500).json({ error: 'Failed to create location' });
    }
  });

  // Survey template endpoints
  app.get('/api/survey-templates/:tenantId', async (req, res) => {
    try {
      const templates = await storage.getSurveyTemplatesByTenant(req.params.tenantId);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching survey templates:', error);
      res.status(500).json({ error: 'Failed to fetch survey templates' });
    }
  });

  app.post('/api/survey-templates', async (req, res) => {
    try {
      const validatedData = insertSurveyTemplateSchema.parse(req.body);
      const template = await storage.createSurveyTemplate(validatedData);
      res.json(template);
    } catch (error) {
      console.error('Error creating survey template:', error);
      res.status(500).json({ error: 'Failed to create survey template' });
    }
  });

  // Alert endpoints
  app.get('/api/alerts/:tenantId', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const alerts = await storage.getAlertNotificationsByTenant(req.params.tenantId, limit);
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  app.post('/api/alert-rules', async (req, res) => {
    try {
      const validatedData = insertAlertRuleSchema.parse(req.body);
      const rule = await storage.createAlertRule(validatedData);
      res.json(rule);
    } catch (error) {
      console.error('Error creating alert rule:', error);
      res.status(500).json({ error: 'Failed to create alert rule' });
    }
  });

  // Mark alert as read
  app.patch('/api/alerts/:id/read', async (req, res) => {
    try {
      const alert = await storage.updateAlertNotification(req.params.id, { isRead: true });
      res.json(alert);
    } catch (error) {
      console.error('Error updating alert:', error);
      res.status(500).json({ error: 'Failed to update alert' });
    }
  });

  // Object storage endpoints for file uploads
  const objectStorage = new ObjectStorageService();

  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorage.getObjectEntityFile(req.path);
      objectStorage.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    try {
      const uploadURL = await objectStorage.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Update feedback with uploaded files
  app.put("/api/feedback/:id/files", async (req, res) => {
    try {
      const { voiceRecordingURL, imageURLs } = req.body;
      
      const updates: any = {};
      
      if (voiceRecordingURL) {
        const voiceObjectPath = objectStorage.normalizeObjectEntityPath(voiceRecordingURL);
        updates.voiceRecordingUrl = voiceObjectPath;
      }
      
      if (imageURLs && Array.isArray(imageURLs)) {
        const normalizedImageURLs = imageURLs.map(url => 
          objectStorage.normalizeObjectEntityPath(url)
        );
        updates.imageUrls = normalizedImageURLs;
      }

      const feedback = await storage.updateFeedbackResponse(req.params.id, updates);
      res.json(feedback);
    } catch (error) {
      console.error("Error updating feedback files:", error);
      res.status(500).json({ error: "Failed to update feedback files" });
    }
  });

  return httpServer;
}
