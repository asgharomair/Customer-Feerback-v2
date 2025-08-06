import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertFeedbackResponseSchema, insertQrCodeSchema, insertLocationSchema, insertSurveyTemplateSchema, insertAlertRuleSchema } from "@shared/schema";
import QRCode from "qrcode";
import { randomUUID } from "crypto";
import { WebSocketService, NotificationEvent } from "./websocket";
import { AlertRuleEngine } from "./alertRuleEngine";
import { EmailService } from "./emailService";
import { SMSService } from "./smsService";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize WebSocket service
  const wsService = new WebSocketService(httpServer);
  
  // Initialize Alert Rule Engine
  const alertRuleEngine = new AlertRuleEngine();
  
  // Initialize Email Service
  const emailService = new EmailService(
    process.env.SENDGRID_API_KEY || '',
    process.env.FROM_EMAIL || 'alerts@feedbackplatform.com',
    process.env.FROM_NAME || 'Feedback Platform'
  );
  
  // Initialize SMS Service
  const smsService = new SMSService(
    process.env.TWILIO_ACCOUNT_SID || '',
    process.env.TWILIO_AUTH_TOKEN || '',
    process.env.TWILIO_FROM_NUMBER || ''
  );

  // Broadcast alert to all connected clients of a tenant
  function broadcastAlert(tenantId: string, alert: any) {
    const event: NotificationEvent = {
      type: 'alert',
      tenantId,
      data: alert,
      severity: alert.severity || 'info'
    };
    wsService.broadcastToTenant(tenantId, event);
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
      const { fileType, fileName, fileSize, tenantId } = req.body;
      
      // Validate required fields
      if (!fileType || !fileName || !tenantId) {
        return res.status(400).json({ 
          error: 'Missing required fields: fileType, fileName, tenantId' 
        });
      }

      // Validate file type
      const allowedTypes = ['voice', 'image'];
      if (!allowedTypes.includes(fileType)) {
        return res.status(400).json({ 
          error: 'Invalid file type. Allowed types: voice, image' 
        });
      }

      // Validate file size (10MB max for images, 50MB for voice)
      const maxSize = fileType === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      if (fileSize && fileSize > maxSize) {
        return res.status(400).json({ 
          error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB` 
        });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Generate unique file path with tenant isolation
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${fileType}/${tenantId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
      
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(uniqueFileName);
      
      res.json({ 
        uploadURL,
        filePath: uniqueFileName,
        expiresIn: 900 // 15 minutes
      });
    } catch (error) {
      console.error('Error getting upload URL:', error);
      res.status(500).json({ error: 'Failed to get upload URL' });
    }
  });

  app.post('/api/feedback', async (req, res) => {
    try {
      const validatedData = insertFeedbackResponseSchema.parse(req.body);
      const feedback = await storage.createFeedbackResponse(validatedData);

      // Broadcast real-time feedback event
      const feedbackEvent: NotificationEvent = {
        type: 'feedback',
        tenantId: feedback.tenantId,
        data: {
          id: feedback.id,
          customerName: feedback.customerName,
          overallRating: feedback.overallRating,
          feedbackText: feedback.feedbackText,
          createdAt: feedback.createdAt,
          hasVoiceRecording: !!feedback.voiceRecordingUrl,
          hasImages: feedback.imageUrls && feedback.imageUrls.length > 0
        },
        severity: feedback.overallRating <= 2 ? 'critical' : feedback.overallRating <= 3 ? 'warning' : 'info'
      };
      wsService.broadcastToTenant(feedback.tenantId, feedbackEvent);

      // Evaluate feedback against alert rules
      const alertResults = await alertRuleEngine.evaluateFeedback(feedback, feedback.tenantId);
      
      // Create alerts for triggered rules
      for (const result of alertResults) {
        if (result.triggered) {
          const alert = await storage.createAlertNotification({
            tenantId: feedback.tenantId,
            alertRuleId: result.data.ruleId,
            feedbackId: feedback.id,
            title: result.data.ruleName,
            message: result.message,
            severity: result.severity
          });

          // Broadcast real-time alert
          broadcastAlert(feedback.tenantId, alert);
        }
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

  // Get signed URL for file access
  app.get("/api/objects/:filePath(*)/url", async (req, res) => {
    try {
      const { filePath } = req.params;
      const { tenantId } = req.query;
      
      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      // Validate tenant access to file
      if (!filePath.includes(`/${tenantId}/`)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const objectStorageService = new ObjectStorageService();
      const signedUrl = await objectStorageService.getSignedDownloadURL(filePath);
      
      res.json({ 
        signedUrl,
        expiresIn: 3600 // 1 hour
      });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      res.status(500).json({ error: 'Failed to generate signed URL' });
    }
  });

  // Delete file
  app.delete("/api/objects/:filePath(*)", async (req, res) => {
    try {
      const { filePath } = req.params;
      const { tenantId } = req.query;
      
      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      // Validate tenant access to file
      if (!filePath.includes(`/${tenantId}/`)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const objectStorageService = new ObjectStorageService();
      await objectStorageService.deleteFile(filePath);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // Get file metadata
  app.get("/api/objects/:filePath(*)/metadata", async (req, res) => {
    try {
      const { filePath } = req.params;
      const { tenantId } = req.query;
      
      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      // Validate tenant access to file
      if (!filePath.includes(`/${tenantId}/`)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const objectStorageService = new ObjectStorageService();
      const metadata = await objectStorageService.getFileMetadata(filePath);
      
      res.json(metadata);
    } catch (error) {
      console.error('Error getting file metadata:', error);
      res.status(500).json({ error: 'Failed to get file metadata' });
    }
  });

  // Email/SMS notification system for alerts (FR-040: Multiple notification channels)
  async function sendAlertNotifications(rule: any, feedback: any, alert: any) {
    try {
      const actions = rule.actions || [];
      
      for (const action of actions) {
        if (action.type === 'email' && action.recipients) {
          try {
            // Determine template based on alert type
            let templateId = 'low-rating-alert';
            if (alert.severity === 'warning') {
              templateId = 'keyword-alert';
            }
            
            // Prepare template data
            const templateData = {
              ruleName: alert.title,
              rating: feedback.overallRating,
              customerName: feedback.customerName || 'Anonymous',
              timestamp: new Date().toLocaleString(),
              feedbackText: feedback.feedbackText || 'No additional comments',
              severity: alert.severity,
              locationName: 'Main Location', // This would come from location data
              dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard`,
              unsubscribeUrl: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/unsubscribe`
            };
            
            // Send email using template
            await emailService.sendTemplateEmail(
              templateId,
              action.recipients,
              templateData,
              {
                from: action.fromEmail || process.env.FROM_EMAIL || 'alerts@feedbackplatform.com'
              },
              alert.severity === 'critical' ? 'urgent' : 'normal'
            );
            
            console.log('Email alert sent successfully');
          } catch (emailError) {
            console.error('Email alert failed:', emailError);
          }
        }
        
        if (action.type === 'sms' && action.phoneNumbers) {
          try {
            // Determine SMS template based on alert type
            let templateId = 'critical-alert';
            if (alert.severity === 'warning') {
              templateId = 'warning-alert';
            }
            
            // Prepare template data
            const templateData = {
              ruleName: alert.title,
              rating: feedback.overallRating,
              customerName: feedback.customerName || 'Anonymous',
              message: alert.message,
              dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard`
            };
            
            // Send SMS to each phone number
            for (const phoneNumber of action.phoneNumbers) {
              // Check if number is opted in
              if (smsService.isOptedIn(phoneNumber)) {
                await smsService.sendTemplateSMS(
                  templateId,
                  phoneNumber,
                  templateData,
                  {
                    priority: alert.severity === 'critical' ? 'urgent' : 'normal'
                  }
                );
              } else {
                console.log(`SMS not sent to ${phoneNumber} - not opted in`);
              }
            }
            
            console.log('SMS alerts sent successfully');
          } catch (smsError) {
            console.error('SMS alert failed:', smsError);
          }
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

  // WebSocket stats endpoint
  app.get('/api/websocket/stats', (req, res) => {
    try {
      const stats = wsService.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting WebSocket stats:', error);
      res.status(500).json({ error: 'Failed to get WebSocket stats' });
    }
  });

  // Alert Rule Engine stats endpoint
  app.get('/api/alerts/engine/stats', (req, res) => {
    try {
      const stats = alertRuleEngine.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting Alert Rule Engine stats:', error);
      res.status(500).json({ error: 'Failed to get Alert Rule Engine stats' });
    }
  });

  // Get alert rules for a tenant
  app.get('/api/alerts/rules/:tenantId', async (req, res) => {
    try {
      const rules = await storage.getAlertRulesByTenant(req.params.tenantId);
      res.json(rules);
    } catch (error) {
      console.error('Error fetching alert rules:', error);
      res.status(500).json({ error: 'Failed to fetch alert rules' });
    }
  });

  // Create alert rule
  app.post('/api/alerts/rules', async (req, res) => {
    try {
      const validatedData = insertAlertRuleSchema.parse(req.body);
      const rule = await storage.createAlertRule(validatedData);
      
      // Add rule to the engine
      alertRuleEngine.addRule({
        id: rule.id,
        name: rule.name,
        description: rule.description || undefined,
        tenantId: rule.tenantId,
        conditions: rule.conditions as any,
        actions: rule.actions as any,
        isActive: rule.isActive,
        priority: 'medium',
        cooldownPeriod: 30
      });
      
      res.json(rule);
    } catch (error) {
      console.error('Error creating alert rule:', error);
      res.status(500).json({ error: 'Failed to create alert rule' });
    }
  });

  // Update alert rule
  app.put('/api/alerts/rules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertAlertRuleSchema.partial().parse(req.body);
      const rule = await storage.updateAlertRule(id, validatedData);
      
      // Update rule in the engine
      alertRuleEngine.addRule({
        id: rule.id,
        name: rule.name,
        description: rule.description || undefined,
        tenantId: rule.tenantId,
        conditions: rule.conditions as any,
        actions: rule.actions as any,
        isActive: rule.isActive,
        priority: 'medium',
        cooldownPeriod: 30
      });
      
      res.json(rule);
    } catch (error) {
      console.error('Error updating alert rule:', error);
      res.status(500).json({ error: 'Failed to update alert rule' });
    }
  });

  // Delete alert rule
  app.delete('/api/alerts/rules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAlertRule(id);
      
      // Remove rule from the engine
      alertRuleEngine.removeRule(id);
      
      res.json({ message: 'Alert rule deleted successfully' });
    } catch (error) {
      console.error('Error deleting alert rule:', error);
      res.status(500).json({ error: 'Failed to delete alert rule' });
    }
  });

  // Test alert rule
  app.post('/api/alerts/rules/:id/test', async (req, res) => {
    try {
      const { id } = req.params;
      const testFeedback = req.body.feedback;
      
      // Get the rule
      const rule = await storage.getAlertRule(id);
      if (!rule) {
        return res.status(404).json({ error: 'Alert rule not found' });
      }
      
      // Test the rule against the provided feedback
      const results = await alertRuleEngine.evaluateFeedback(testFeedback, rule.tenantId);
      const ruleResult = results.find(r => r.data.ruleId === id);
      
      res.json({
        triggered: ruleResult?.triggered || false,
        message: ruleResult?.message || 'Rule did not trigger',
        severity: ruleResult?.severity || 'info'
      });
    } catch (error) {
      console.error('Error testing alert rule:', error);
      res.status(500).json({ error: 'Failed to test alert rule' });
    }
  });

  // Email service endpoints
  app.get('/api/email/stats', (req, res) => {
    try {
      const stats = emailService.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting email stats:', error);
      res.status(500).json({ error: 'Failed to get email stats' });
    }
  });

  app.get('/api/email/templates', (req, res) => {
    try {
      const templates = emailService.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error getting email templates:', error);
      res.status(500).json({ error: 'Failed to get email templates' });
    }
  });

  app.post('/api/email/send', async (req, res) => {
    try {
      const { to, subject, html, text, templateId, templateData } = req.body;
      
      if (templateId) {
        const deliveryStatus = await emailService.sendTemplateEmail(templateId, to, templateData || {});
        res.json(deliveryStatus);
      } else {
        const deliveryStatus = await emailService.sendEmail({
          to,
          subject,
          html,
          text
        });
        res.json(deliveryStatus);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  app.post('/api/email/queue', (req, res) => {
    try {
      const { to, subject, html, text, templateId, templateData, priority, delayMinutes } = req.body;
      
      let emailId: string;
      if (templateId) {
        emailId = emailService.queueTemplateEmail(templateId, to, templateData || {}, {}, priority || 'normal', delayMinutes || 0);
      } else {
        emailId = emailService.queueEmail({
          to,
          subject,
          html,
          text
        }, priority || 'normal', delayMinutes || 0);
      }
      
      res.json({ emailId, message: 'Email queued successfully' });
    } catch (error) {
      console.error('Error queuing email:', error);
      res.status(500).json({ error: 'Failed to queue email' });
    }
  });

  app.delete('/api/email/queue/:emailId', (req, res) => {
    try {
      const { emailId } = req.params;
      const cancelled = emailService.cancelEmail(emailId);
      
      if (cancelled) {
        res.json({ message: 'Email cancelled successfully' });
      } else {
        res.status(404).json({ error: 'Email not found or already processed' });
      }
    } catch (error) {
      console.error('Error cancelling email:', error);
      res.status(500).json({ error: 'Failed to cancel email' });
    }
  });

  // SMS service endpoints
  app.get('/api/sms/stats', (req, res) => {
    try {
      const stats = smsService.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting SMS stats:', error);
      res.status(500).json({ error: 'Failed to get SMS stats' });
    }
  });

  app.get('/api/sms/templates', (req, res) => {
    try {
      const templates = smsService.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error getting SMS templates:', error);
      res.status(500).json({ error: 'Failed to get SMS templates' });
    }
  });

  app.post('/api/sms/send', async (req, res) => {
    try {
      const { to, message, templateId, templateData } = req.body;
      
      if (templateId) {
        const deliveryStatus = await smsService.sendTemplateSMS(templateId, to, templateData || {});
        res.json(deliveryStatus);
      } else {
        const deliveryStatus = await smsService.sendSMS({
          to,
          message
        });
        res.json(deliveryStatus);
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      res.status(500).json({ error: 'Failed to send SMS' });
    }
  });

  app.post('/api/sms/queue', (req, res) => {
    try {
      const { to, message, templateId, templateData, priority, delayMinutes } = req.body;
      
      let smsId: string;
      if (templateId) {
        smsId = smsService.queueTemplateSMS(templateId, to, templateData || {}, {}, delayMinutes || 0);
      } else {
        smsId = smsService.queueSMS({
          to,
          message,
          priority: priority || 'normal'
        }, delayMinutes || 0);
      }
      
      res.json({ smsId, message: 'SMS queued successfully' });
    } catch (error) {
      console.error('Error queuing SMS:', error);
      res.status(500).json({ error: 'Failed to queue SMS' });
    }
  });

  app.delete('/api/sms/queue/:smsId', (req, res) => {
    try {
      const { smsId } = req.params;
      const cancelled = smsService.cancelSMS(smsId);
      
      if (cancelled) {
        res.json({ message: 'SMS cancelled successfully' });
      } else {
        res.status(404).json({ error: 'SMS not found or already processed' });
      }
    } catch (error) {
      console.error('Error cancelling SMS:', error);
      res.status(500).json({ error: 'Failed to cancel SMS' });
    }
  });

  // SMS opt-in/opt-out endpoints
  app.post('/api/sms/opt-in', (req, res) => {
    try {
      const { phoneNumber, tenantId, source } = req.body;
      smsService.optIn(phoneNumber, tenantId, source || 'api');
      res.json({ message: 'Successfully opted in to SMS alerts' });
    } catch (error) {
      console.error('Error opting in to SMS:', error);
      res.status(500).json({ error: 'Failed to opt in to SMS' });
    }
  });

  app.post('/api/sms/opt-out', (req, res) => {
    try {
      const { phoneNumber, tenantId, reason } = req.body;
      smsService.optOut(phoneNumber, tenantId, reason);
      res.json({ message: 'Successfully opted out of SMS alerts' });
    } catch (error) {
      console.error('Error opting out of SMS:', error);
      res.status(500).json({ error: 'Failed to opt out of SMS' });
    }
  });

  app.get('/api/sms/opt-status/:phoneNumber', (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const isOptedIn = smsService.isOptedIn(phoneNumber);
      const isOptedOut = smsService.isOptedOut(phoneNumber);
      
      res.json({
        phoneNumber,
        isOptedIn,
        isOptedOut,
        status: isOptedIn ? 'opted-in' : isOptedOut ? 'opted-out' : 'not-registered'
      });
    } catch (error) {
      console.error('Error checking SMS opt status:', error);
      res.status(500).json({ error: 'Failed to check SMS opt status' });
    }
  });

  // Twilio webhook for incoming SMS (opt-in/opt-out)
  app.post('/api/sms/webhook', (req, res) => {
    try {
      const { From, Body, To } = req.body;
      const tenantId = req.query.tenantId as string;
      
      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }
      
      const result = smsService.handleIncomingSMS(From, Body, tenantId);
      
      // Send response SMS if needed
      if (result.response) {
        // In a real implementation, you would send the response SMS here
        console.log('Would send response SMS:', result.response);
      }
      
      res.json({ 
        success: true, 
        action: result.action,
        response: result.response 
      });
    } catch (error) {
      console.error('Error handling SMS webhook:', error);
      res.status(500).json({ error: 'Failed to handle SMS webhook' });
    }
  });

  return httpServer;
}
