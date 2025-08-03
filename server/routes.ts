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

  wss.on('connection', (ws: any, req) => {
    const clientId = randomUUID();
    clients.set(clientId, ws);

    ws.on('message', (message: any) => {
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
    clients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN && client.tenantId === tenantId) {
        client.send(JSON.stringify({
          type: 'alert',
          data: alert
        }));
      }
    });
  }

  // Company onboarding endpoint
  app.post('/api/tenants', async (req, res) => {
    try {
      console.log('Creating tenant with data:', req.body);
      
      // Validate required fields
      const requiredFields = ['legalName', 'brandName', 'industry', 'primaryContactName', 'primaryContactEmail'];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({ 
            error: `Missing required field: ${field}` 
          });
        }
      }

      const tenant = await storage.createTenant(req.body);
      
      // Create default location based on business address
      const defaultLocation = await storage.createLocation({
        tenantId: tenant.id,
        name: req.body.brandName + " - Main Location",
        address: req.body.businessAddress || "Main Location",
        city: req.body.city || "City",
        state: req.body.state || "State",
        zipCode: req.body.postalCode || "00000",
        phone: req.body.primaryContactPhone || null,
        email: req.body.primaryContactEmail,
        isActive: true
      });

      // Create industry-specific survey template
      await storage.createSurveyTemplate({
        tenantId: tenant.id,
        name: `${req.body.industry} Feedback Survey`,
        description: `Customer feedback form for ${req.body.brandName}`,
        industry: tenant.industry,
        fields: JSON.stringify([
          { id: 'customer_name', type: 'text', label: 'Your Name', required: true },
          { id: 'customer_email', type: 'email', label: 'Email (Optional)', required: false },
          { id: 'overall_rating', type: 'rating', label: 'Overall Experience', required: true, scale: 5 },
          { id: 'feedback_text', type: 'textarea', label: 'Your Feedback', required: false }
        ]),
        isDefault: true,
        isActive: true
      });

      console.log('Tenant created successfully:', tenant.id);
      res.json(tenant);
    } catch (error) {
      console.error('Error creating tenant:', error);
      res.status(500).json({ 
        error: 'Failed to create company profile', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Branch/Location management endpoints
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
      const location = await storage.createLocation(req.body);
      res.json(location);
    } catch (error) {
      console.error('Error creating location:', error);
      res.status(500).json({ error: 'Failed to create location' });
    }
  });

  app.put('/api/locations/:id', async (req, res) => {
    try {
      const location = await storage.updateLocation(req.params.id, req.body);
      res.json(location);
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ error: 'Failed to update location' });
    }
  });

  app.delete('/api/locations/:id', async (req, res) => {
    try {
      // Get all QR codes for this location and delete them first
      const qrCodes = await storage.getQrCodesByLocation(req.params.id);
      for (const qrCode of qrCodes) {
        // In a real app, you'd have a delete method
        // await storage.deleteQrCode(qrCode.id);
      }
      
      // For now, we'll just mark location as inactive
      await storage.updateLocation(req.params.id, { isActive: false });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting location:', error);
      res.status(500).json({ error: 'Failed to delete location' });
    }
  });

  // QR Code management endpoints
  app.get('/api/qr-codes/:tenantId', async (req, res) => {
    try {
      const qrCodes = await storage.getQrCodesByTenant(req.params.tenantId);
      res.json(qrCodes);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      res.status(500).json({ error: 'Failed to fetch QR codes' });
    }
  });

  app.post('/api/qr-codes', async (req, res) => {
    try {
      // Generate QR data URL for feedback form
      const qrData = `${req.protocol}://${req.get('host')}/feedback?t=${req.body.tenantId}&l=${req.body.locationId}&q=${req.body.identifier}`;
      
      const qrCodeData = {
        ...req.body,
        qrData: qrData,
        url: qrData
      };
      
      const qrCode = await storage.createQrCode(qrCodeData);
      res.json(qrCode);
    } catch (error) {
      console.error('Error creating QR code:', error);
      res.status(500).json({ error: 'Failed to create QR code' });
    }
  });

  // Object storage endpoints (simplified for now)
  app.post('/api/objects/upload', async (req, res) => {
    try {
      // For now, return a mock upload URL since object storage needs proper setup
      const mockUploadUrl = `https://storage.googleapis.com/mock-bucket/uploads/${Date.now()}.jpg`;
      res.json({ uploadURL: mockUploadUrl });
    } catch (error) {
      console.error('Error getting upload URL:', error);
      res.status(500).json({ error: 'Failed to get upload URL' });
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
      const template = await storage.createSurveyTemplate(req.body);
      res.json(template);
    } catch (error) {
      console.error('Error creating survey template:', error);
      res.status(500).json({ error: 'Failed to create survey template' });
    }
  });

  app.put('/api/survey-templates/:id', async (req, res) => {
    try {
      const template = await storage.updateSurveyTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error) {
      console.error('Error updating survey template:', error);
      res.status(500).json({ error: 'Failed to update survey template' });
    }
  });

  app.delete('/api/survey-templates/:id', async (req, res) => {
    try {
      await storage.deleteSurveyTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting survey template:', error);
      res.status(500).json({ error: 'Failed to delete survey template' });
    }
  });

  // Object storage endpoints for voice and image uploads  
  app.post('/api/objects/upload', async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error('Error getting upload URL:', error);
      res.status(500).json({ error: 'Failed to get upload URL' });
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

  // Public reviews endpoint (FR-080: Public review integration)
  app.get('/api/public-reviews/:tenantId', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const locationId = req.query.locationId as string;
      
      // Fetch feedback that's marked as public (high ratings only)
      let feedback = await storage.getFeedbackResponsesByTenant(req.params.tenantId, limit);
      
      // Filter for public display (only positive reviews with rating >= 4)
      const publicReviews = feedback
        .filter(review => review.overallRating >= 4 && review.customerName)
        .map(review => ({
          id: review.id,
          customerName: review.customerName,
          overallRating: review.overallRating,
          feedbackText: review.feedbackText,
          voiceRecordingUrl: review.voiceRecordingUrl,
          imageUrls: review.imageUrls,
          createdAt: review.createdAt,
          isPublic: true
        }));

      res.json(publicReviews);
    } catch (error) {
      console.error('Error fetching public reviews:', error);
      res.status(500).json({ error: 'Failed to fetch public reviews' });
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

  // Email/SMS notification system for alerts (FR-040: Multiple notification channels)
  async function sendAlertNotifications(rule: any, feedback: any, alert: any) {
    try {
      const actions = rule.actions || [];
      
      for (const action of actions) {
        if (action.type === 'email' && action.recipients) {
          // Send email notifications using SendGrid
          const { MailService } = await import('@sendgrid/mail');
          
          if (process.env.SENDGRID_API_KEY) {
            const mailService = new MailService();
            mailService.setApiKey(process.env.SENDGRID_API_KEY);
            
            const emailContent = {
              to: action.recipients,
              from: action.fromEmail || 'alerts@feedbackplatform.com',
              subject: `${alert.severity.toUpperCase()}: ${alert.title}`,
              html: `
                <h2>${alert.title}</h2>
                <p><strong>Severity:</strong> ${alert.severity}</p>
                <p><strong>Message:</strong> ${alert.message}</p>
                <p><strong>Customer Rating:</strong> ${feedback.overallRating}/5</p>
                <p><strong>Customer Name:</strong> ${feedback.customerName || 'Anonymous'}</p>
                <p><strong>Feedback:</strong> ${feedback.feedbackText || 'No additional comments'}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <hr>
                <p><em>This is an automated alert from your Feedback Management System.</em></p>
              `
            };
            
            await mailService.send(emailContent);
            console.log('Email alert sent successfully');
          }
        }
        
        if (action.type === 'sms' && action.phoneNumbers) {
          // SMS notifications would be implemented here with Twilio or similar service
          console.log('SMS alert would be sent to:', action.phoneNumbers);
          console.log('SMS content:', `ALERT: ${alert.title} - Rating: ${feedback.overallRating}/5`);
        }
        
        if (action.type === 'webhook' && action.url) {
          // Send webhook notification
          try {
            await fetch(action.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                alert,
                feedback,
                timestamp: new Date().toISOString()
              })
            });
            console.log('Webhook alert sent successfully');
          } catch (webhookError) {
            console.error('Webhook alert failed:', webhookError);
          }
        }
      }
    } catch (error) {
      console.error('Error sending alert notifications:', error);
    }
  }

  return httpServer;
}
