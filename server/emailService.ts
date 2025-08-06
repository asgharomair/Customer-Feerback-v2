import sgMail from '@sendgrid/mail';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
  variables: string[];
}

export interface EmailRequest {
  to: string | string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition?: string;
  }>;
  trackingSettings?: {
    clickTracking?: boolean;
    openTracking?: boolean;
    subscriptionTracking?: boolean;
  };
}

export interface EmailDeliveryStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'bounced' | 'dropped' | 'deferred' | 'failed';
  timestamp: Date;
  recipient: string;
  error?: string;
}

export interface EmailQueueItem {
  id: string;
  request: EmailRequest;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  retryCount: number;
  maxRetries: number;
  scheduledAt: Date;
  createdAt: Date;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  deliveryStatus?: EmailDeliveryStatus;
}

export class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private templates: Map<string, EmailTemplate> = new Map();
  private queue: EmailQueueItem[] = [];
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;
  private deliveryTracking: Map<string, EmailDeliveryStatus> = new Map();

  constructor(apiKey: string, fromEmail: string, fromName: string = 'Feedback Platform') {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    this.fromName = fromName;
    
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.initializeTemplates();
      this.startQueueProcessing();
    }
  }

  // Initialize default email templates
  private initializeTemplates(): void {
    const defaultTemplates: EmailTemplate[] = [
      {
        id: 'low-rating-alert',
        name: 'Low Rating Alert',
        subject: '🚨 Critical Alert: Low Customer Rating Received',
        htmlTemplate: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{{subject}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
              .alert-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .rating { font-size: 24px; font-weight: bold; color: #dc3545; }
              .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px; }
              .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚨 Critical Alert</h1>
                <p>Low Customer Rating Received</p>
              </div>
              <div class="content">
                <div class="alert-box">
                  <h2>{{ruleName}}</h2>
                  <p><strong>Customer Rating:</strong> <span class="rating">{{rating}}/5</span></p>
                  <p><strong>Customer:</strong> {{customerName}}</p>
                  <p><strong>Time:</strong> {{timestamp}}</p>
                  <p><strong>Feedback:</strong></p>
                  <blockquote>{{feedbackText}}</blockquote>
                </div>
                
                <p><strong>Alert Details:</strong></p>
                <ul>
                  <li><strong>Rule:</strong> {{ruleName}}</li>
                  <li><strong>Severity:</strong> {{severity}}</li>
                  <li><strong>Location:</strong> {{locationName}}</li>
                </ul>
                
                <p style="text-align: center; margin-top: 30px;">
                  <a href="{{dashboardUrl}}" class="button">View in Dashboard</a>
                </p>
              </div>
              <div class="footer">
                <p>This is an automated alert from your Feedback Management System.</p>
                <p>To unsubscribe from these alerts, <a href="{{unsubscribeUrl}}">click here</a>.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        textTemplate: `
Critical Alert: Low Customer Rating

Rule: {{ruleName}}
Customer Rating: {{rating}}/5
Customer: {{customerName}}
Time: {{timestamp}}

Feedback:
{{feedbackText}}

Alert Details:
- Rule: {{ruleName}}
- Severity: {{severity}}
- Location: {{locationName}}

View in Dashboard: {{dashboardUrl}}

This is an automated alert from your Feedback Management System.
To unsubscribe: {{unsubscribeUrl}}
        `,
        variables: ['ruleName', 'rating', 'customerName', 'timestamp', 'feedbackText', 'severity', 'locationName', 'dashboardUrl', 'unsubscribeUrl']
      },
      {
        id: 'keyword-alert',
        name: 'Keyword Detection Alert',
        subject: '⚠️ Alert: Keywords Detected in Feedback',
        htmlTemplate: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{{subject}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #ffc107; color: #212529; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
              .alert-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .keywords { background: #e9ecef; padding: 10px; border-radius: 5px; margin: 10px 0; }
              .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px; }
              .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ Keyword Alert</h1>
                <p>Keywords Detected in Customer Feedback</p>
              </div>
              <div class="content">
                <div class="alert-box">
                  <h2>{{ruleName}}</h2>
                  <p><strong>Detected Keywords:</strong></p>
                  <div class="keywords">{{keywords}}</div>
                  <p><strong>Customer:</strong> {{customerName}}</p>
                  <p><strong>Rating:</strong> {{rating}}/5</p>
                  <p><strong>Time:</strong> {{timestamp}}</p>
                </div>
                
                <p><strong>Feedback Text:</strong></p>
                <blockquote>{{feedbackText}}</blockquote>
                
                <p style="text-align: center; margin-top: 30px;">
                  <a href="{{dashboardUrl}}" class="button">View in Dashboard</a>
                </p>
              </div>
              <div class="footer">
                <p>This is an automated alert from your Feedback Management System.</p>
                <p>To unsubscribe from these alerts, <a href="{{unsubscribeUrl}}">click here</a>.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        variables: ['ruleName', 'keywords', 'customerName', 'rating', 'timestamp', 'feedbackText', 'dashboardUrl', 'unsubscribeUrl']
      },
      {
        id: 'volume-alert',
        name: 'High Volume Alert',
        subject: '📊 Alert: High Feedback Volume Detected',
        htmlTemplate: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{{subject}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #17a2b8; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
              .stats-box { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px; }
              .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📊 Volume Alert</h1>
                <p>High Feedback Volume Detected</p>
              </div>
              <div class="content">
                <div class="stats-box">
                  <h2>{{ruleName}}</h2>
                  <p><strong>Feedback Count:</strong> {{feedbackCount}}</p>
                  <p><strong>Time Window:</strong> {{timeWindow}} minutes</p>
                  <p><strong>Threshold:</strong> {{threshold}}</p>
                  <p><strong>Average Rating:</strong> {{averageRating}}/5</p>
                </div>
                
                <p><strong>Recent Feedback Summary:</strong></p>
                <ul>
                  {{#each recentFeedback}}
                  <li>{{customerName}} - {{rating}}/5 - {{createdAt}}</li>
                  {{/each}}
                </ul>
                
                <p style="text-align: center; margin-top: 30px;">
                  <a href="{{dashboardUrl}}" class="button">View Analytics</a>
                </p>
              </div>
              <div class="footer">
                <p>This is an automated alert from your Feedback Management System.</p>
                <p>To unsubscribe from these alerts, <a href="{{unsubscribeUrl}}">click here</a>.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        variables: ['ruleName', 'feedbackCount', 'timeWindow', 'threshold', 'averageRating', 'recentFeedback', 'dashboardUrl', 'unsubscribeUrl']
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  // Send email immediately
  public async sendEmail(request: EmailRequest): Promise<EmailDeliveryStatus> {
    if (!this.apiKey) {
      throw new Error('SendGrid API key not configured');
    }

    try {
      const msg = {
        to: request.to,
        from: {
          email: request.from || this.fromEmail,
          name: this.fromName
        },
        subject: request.subject,
        html: request.html,
        text: request.text,
        templateId: request.templateId,
        dynamicTemplateData: request.templateData,
        attachments: request.attachments,
        trackingSettings: request.trackingSettings || {
          clickTracking: { enable: true },
          openTracking: { enable: true },
          subscriptionTracking: { enable: true }
        }
      };

      const [response] = await sgMail.send(msg);
      
      const deliveryStatus: EmailDeliveryStatus = {
        messageId: response.headers['x-message-id'] as string,
        status: 'sent',
        timestamp: new Date(),
        recipient: Array.isArray(request.to) ? request.to[0] : request.to
      };

      this.deliveryTracking.set(deliveryStatus.messageId, deliveryStatus);
      return deliveryStatus;

    } catch (error: any) {
      console.error('Email sending failed:', error);
      
      const deliveryStatus: EmailDeliveryStatus = {
        messageId: '',
        status: 'failed',
        timestamp: new Date(),
        recipient: Array.isArray(request.to) ? request.to[0] : request.to,
        error: error.message
      };

      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  // Queue email for later sending
  public queueEmail(request: EmailRequest, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal', delayMinutes: number = 0): string {
    const id = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queueItem: EmailQueueItem = {
      id,
      request,
      priority,
      retryCount: 0,
      maxRetries: 3,
      scheduledAt: new Date(Date.now() + (delayMinutes * 60 * 1000)),
      createdAt: new Date(),
      status: 'pending'
    };

    this.queue.push(queueItem);
    this.sortQueue();
    
    return id;
  }

  // Process email queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const now = new Date();

    try {
      // Process items that are scheduled to be sent
      const itemsToProcess = this.queue.filter(item => 
        item.status === 'pending' && 
        item.scheduledAt <= now
      );

      for (const item of itemsToProcess) {
        try {
          item.status = 'processing';
          
          const deliveryStatus = await this.sendEmail(item.request);
          item.status = 'sent';
          item.deliveryStatus = deliveryStatus;
          
          // Remove from queue after successful sending
          this.queue = this.queue.filter(q => q.id !== item.id);
          
        } catch (error: any) {
          item.retryCount++;
          
          if (item.retryCount >= item.maxRetries) {
            item.status = 'failed';
            item.deliveryStatus = {
              messageId: '',
              status: 'failed',
              timestamp: new Date(),
              recipient: Array.isArray(item.request.to) ? item.request.to[0] : item.request.to,
              error: error.message
            };
          } else {
            // Reschedule for retry
            item.status = 'pending';
            item.scheduledAt = new Date(Date.now() + (Math.pow(2, item.retryCount) * 5 * 60 * 1000)); // Exponential backoff
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Start queue processing
  private startQueueProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 10000); // Process every 10 seconds
  }

  // Stop queue processing
  public stopQueueProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }

  // Sort queue by priority and scheduled time
  private sortQueue(): void {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    
    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.scheduledAt.getTime() - b.scheduledAt.getTime();
    });
  }

  // Get queue status
  public getQueueStatus(): any {
    return {
      totalItems: this.queue.length,
      pending: this.queue.filter(item => item.status === 'pending').length,
      processing: this.queue.filter(item => item.status === 'processing').length,
      sent: this.queue.filter(item => item.status === 'sent').length,
      failed: this.queue.filter(item => item.status === 'failed').length,
      cancelled: this.queue.filter(item => item.status === 'cancelled').length
    };
  }

  // Cancel queued email
  public cancelEmail(emailId: string): boolean {
    const item = this.queue.find(q => q.id === emailId);
    if (item && item.status === 'pending') {
      item.status = 'cancelled';
      return true;
    }
    return false;
  }

  // Get delivery status
  public getDeliveryStatus(messageId: string): EmailDeliveryStatus | undefined {
    return this.deliveryTracking.get(messageId);
  }

  // Get all delivery statuses
  public getAllDeliveryStatuses(): EmailDeliveryStatus[] {
    return Array.from(this.deliveryTracking.values());
  }

  // Add custom template
  public addTemplate(template: EmailTemplate): void {
    this.templates.set(template.id, template);
  }

  // Get template
  public getTemplate(templateId: string): EmailTemplate | undefined {
    return this.templates.get(templateId);
  }

  // Get all templates
  public getAllTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  // Render template
  public renderTemplate(templateId: string, data: Record<string, any>): { html: string; text?: string } {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let html = template.htmlTemplate;
    let text = template.textTemplate;

    // Replace variables in template
    template.variables.forEach(variable => {
      const value = data[variable] || '';
      const regex = new RegExp(`{{${variable}}}`, 'g');
      html = html.replace(regex, value);
      if (text) {
        text = text.replace(regex, value);
      }
    });

    return { html, text };
  }

  // Send email using template
  public async sendTemplateEmail(templateId: string, to: string | string[], data: Record<string, any>, options: Partial<EmailRequest> = {}): Promise<EmailDeliveryStatus> {
    const { html, text } = this.renderTemplate(templateId, data);
    const template = this.templates.get(templateId);
    
    const request: EmailRequest = {
      to,
      from: options.from || this.fromEmail,
      subject: template?.subject || 'Notification',
      html,
      text,
      ...options
    };

    return this.sendEmail(request);
  }

  // Queue template email
  public queueTemplateEmail(templateId: string, to: string | string[], data: Record<string, any>, options: Partial<EmailRequest> = {}, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal', delayMinutes: number = 0): string {
    const { html, text } = this.renderTemplate(templateId, data);
    const template = this.templates.get(templateId);
    
    const request: EmailRequest = {
      to,
      from: options.from || this.fromEmail,
      subject: template?.subject || 'Notification',
      html,
      text,
      ...options
    };

    return this.queueEmail(request, priority, delayMinutes);
  }

  // Clean up old delivery tracking data
  public cleanupOldTrackingData(daysToKeep: number = 30): void {
    const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
    
    for (const [messageId, status] of this.deliveryTracking.entries()) {
      if (status.timestamp < cutoffDate) {
        this.deliveryTracking.delete(messageId);
      }
    }
  }

  // Get service statistics
  public getStats(): any {
    return {
      queueStatus: this.getQueueStatus(),
      deliveryTracking: {
        total: this.deliveryTracking.size,
        sent: Array.from(this.deliveryTracking.values()).filter(s => s.status === 'sent').length,
        failed: Array.from(this.deliveryTracking.values()).filter(s => s.status === 'failed').length
      },
      templates: this.templates.size,
      isConfigured: !!this.apiKey
    };
  }
} 