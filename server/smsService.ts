import twilio from 'twilio';

export interface SMSTemplate {
  id: string;
  name: string;
  message: string;
  variables: string[];
  maxLength: number;
}

export interface SMSRequest {
  to: string;
  from: string;
  message: string;
  templateId?: string;
  templateData?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface SMSDeliveryStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'failed' | 'undelivered' | 'pending';
  timestamp: Date;
  recipient: string;
  error?: string;
  errorCode?: string;
}

export interface SMSQueueItem {
  id: string;
  request: SMSRequest;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  retryCount: number;
  maxRetries: number;
  scheduledAt: Date;
  createdAt: Date;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  deliveryStatus?: SMSDeliveryStatus;
}

export interface SMSOptIn {
  phoneNumber: string;
  tenantId: string;
  optInDate: Date;
  optInSource: 'web' | 'sms' | 'api';
  isActive: boolean;
  lastMessageDate?: Date;
}

export interface SMSOptOut {
  phoneNumber: string;
  tenantId: string;
  optOutDate: Date;
  optOutReason?: string;
}

export class SMSService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string;
  private templates: Map<string, SMSTemplate> = new Map();
  private queue: SMSQueueItem[] = [];
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;
  private deliveryTracking: Map<string, SMSDeliveryStatus> = new Map();
  private optIns: Map<string, SMSOptIn> = new Map();
  private optOuts: Map<string, SMSOptOut> = new Map();

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.fromNumber = fromNumber;
    
    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
      this.initializeTemplates();
      this.startQueueProcessing();
    }
  }

  // Initialize default SMS templates
  private initializeTemplates(): void {
    const defaultTemplates: SMSTemplate[] = [
      {
        id: 'critical-alert',
        name: 'Critical Alert',
        message: '🚨 CRITICAL: {{ruleName}} - Customer {{customerName}} gave {{rating}}/5 rating. View: {{dashboardUrl}}',
        variables: ['ruleName', 'customerName', 'rating', 'dashboardUrl'],
        maxLength: 160
      },
      {
        id: 'warning-alert',
        name: 'Warning Alert',
        message: '⚠️ ALERT: {{ruleName}} - {{message}} - View: {{dashboardUrl}}',
        variables: ['ruleName', 'message', 'dashboardUrl'],
        maxLength: 160
      },
      {
        id: 'keyword-alert',
        name: 'Keyword Detection',
        message: '🔍 KEYWORD: {{ruleName}} - Keywords "{{keywords}}" detected in feedback from {{customerName}}. View: {{dashboardUrl}}',
        variables: ['ruleName', 'keywords', 'customerName', 'dashboardUrl'],
        maxLength: 160
      },
      {
        id: 'volume-alert',
        name: 'High Volume Alert',
        message: '📊 VOLUME: {{ruleName}} - {{feedbackCount}} feedbacks in {{timeWindow}}min. Avg rating: {{averageRating}}/5. View: {{dashboardUrl}}',
        variables: ['ruleName', 'feedbackCount', 'timeWindow', 'averageRating', 'dashboardUrl'],
        maxLength: 160
      },
      {
        id: 'opt-in-confirmation',
        name: 'Opt-in Confirmation',
        message: '✅ You have successfully opted in to receive SMS alerts from {{companyName}}. Reply STOP to opt out.',
        variables: ['companyName'],
        maxLength: 160
      },
      {
        id: 'opt-out-confirmation',
        name: 'Opt-out Confirmation',
        message: '📵 You have been unsubscribed from SMS alerts from {{companyName}}. Reply START to opt back in.',
        variables: ['companyName'],
        maxLength: 160
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  // Send SMS immediately
  public async sendSMS(request: SMSRequest): Promise<SMSDeliveryStatus> {
    if (!this.client) {
      throw new Error('Twilio client not configured');
    }

    // Check if number is opted out
    if (this.isOptedOut(request.to)) {
      throw new Error('Phone number has opted out of SMS');
    }

    try {
      const message = await this.client.messages.create({
        body: request.message,
        from: request.from || this.fromNumber,
        to: request.to
      });

      const deliveryStatus: SMSDeliveryStatus = {
        messageId: message.sid,
        status: message.status as any,
        timestamp: new Date(),
        recipient: request.to,
        error: message.errorMessage || undefined,
        errorCode: message.errorCode?.toString()
      };

      this.deliveryTracking.set(deliveryStatus.messageId, deliveryStatus);
      
      // Update opt-in last message date
      this.updateOptInLastMessage(request.to);

      return deliveryStatus;

    } catch (error: any) {
      console.error('SMS sending failed:', error);
      
      const deliveryStatus: SMSDeliveryStatus = {
        messageId: '',
        status: 'failed',
        timestamp: new Date(),
        recipient: request.to,
        error: error.message
      };

      throw new Error(`SMS sending failed: ${error.message}`);
    }
  }

  // Queue SMS for later sending
  public queueSMS(request: SMSRequest, delayMinutes: number = 0): string {
    const id = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queueItem: SMSQueueItem = {
      id,
      request,
      priority: request.priority || 'normal',
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

  // Process SMS queue
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
          
          const deliveryStatus = await this.sendSMS(item.request);
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
              recipient: item.request.to,
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

  // Cancel queued SMS
  public cancelSMS(smsId: string): boolean {
    const item = this.queue.find(q => q.id === smsId);
    if (item && item.status === 'pending') {
      item.status = 'cancelled';
      return true;
    }
    return false;
  }

  // Get delivery status
  public getDeliveryStatus(messageId: string): SMSDeliveryStatus | undefined {
    return this.deliveryTracking.get(messageId);
  }

  // Get all delivery statuses
  public getAllDeliveryStatuses(): SMSDeliveryStatus[] {
    return Array.from(this.deliveryTracking.values());
  }

  // Opt-in management
  public optIn(phoneNumber: string, tenantId: string, source: 'web' | 'sms' | 'api' = 'api'): void {
    const optIn: SMSOptIn = {
      phoneNumber,
      tenantId,
      optInDate: new Date(),
      optInSource: source,
      isActive: true
    };
    
    this.optIns.set(phoneNumber, optIn);
    
    // Remove from opt-outs if exists
    this.optOuts.delete(phoneNumber);
  }

  public optOut(phoneNumber: string, tenantId: string, reason?: string): void {
    const optOut: SMSOptOut = {
      phoneNumber,
      tenantId,
      optOutDate: new Date(),
      optOutReason: reason
    };
    
    this.optOuts.set(phoneNumber, optOut);
    
    // Remove from opt-ins if exists
    this.optIns.delete(phoneNumber);
  }

  public isOptedIn(phoneNumber: string): boolean {
    return this.optIns.has(phoneNumber) && this.optIns.get(phoneNumber)!.isActive;
  }

  public isOptedOut(phoneNumber: string): boolean {
    return this.optOuts.has(phoneNumber);
  }

  private updateOptInLastMessage(phoneNumber: string): void {
    const optIn = this.optIns.get(phoneNumber);
    if (optIn) {
      optIn.lastMessageDate = new Date();
    }
  }

  // Get opt-in/opt-out statistics
  public getOptInStats(): any {
    return {
      totalOptIns: this.optIns.size,
      activeOptIns: Array.from(this.optIns.values()).filter(o => o.isActive).length,
      totalOptOuts: this.optOuts.size,
      optInsBySource: {
        web: Array.from(this.optIns.values()).filter(o => o.optInSource === 'web').length,
        sms: Array.from(this.optIns.values()).filter(o => o.optInSource === 'sms').length,
        api: Array.from(this.optIns.values()).filter(o => o.optInSource === 'api').length
      }
    };
  }

  // Add custom template
  public addTemplate(template: SMSTemplate): void {
    this.templates.set(template.id, template);
  }

  // Get template
  public getTemplate(templateId: string): SMSTemplate | undefined {
    return this.templates.get(templateId);
  }

  // Get all templates
  public getAllTemplates(): SMSTemplate[] {
    return Array.from(this.templates.values());
  }

  // Render template
  public renderTemplate(templateId: string, data: Record<string, any>): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let message = template.message;

    // Replace variables in template
    template.variables.forEach(variable => {
      const value = data[variable] || '';
      const regex = new RegExp(`{{${variable}}}`, 'g');
      message = message.replace(regex, value);
    });

    // Check message length
    if (message.length > template.maxLength) {
      console.warn(`SMS message exceeds maximum length (${template.maxLength}): ${message.length}`);
    }

    return message;
  }

  // Send SMS using template
  public async sendTemplateSMS(templateId: string, to: string, data: Record<string, any>, options: Partial<SMSRequest> = {}): Promise<SMSDeliveryStatus> {
    const message = this.renderTemplate(templateId, data);
    
    const request: SMSRequest = {
      to,
      from: options.from || this.fromNumber,
      message,
      priority: options.priority || 'normal'
    };

    return this.sendSMS(request);
  }

  // Queue template SMS
  public queueTemplateSMS(templateId: string, to: string, data: Record<string, any>, options: Partial<SMSRequest> = {}, delayMinutes: number = 0): string {
    const message = this.renderTemplate(templateId, data);
    
    const request: SMSRequest = {
      to,
      from: options.from || this.fromNumber,
      message,
      priority: options.priority || 'normal'
    };

    return this.queueSMS(request, delayMinutes);
  }

  // Handle incoming SMS (for opt-in/opt-out)
  public handleIncomingSMS(from: string, body: string, tenantId: string): { response?: string; action: 'opt-in' | 'opt-out' | 'none' } {
    const message = body.toLowerCase().trim();
    
    if (message === 'start' || message === 'subscribe' || message === 'yes') {
      this.optIn(from, tenantId, 'sms');
      return {
        response: this.renderTemplate('opt-in-confirmation', { companyName: 'Feedback Platform' }),
        action: 'opt-in'
      };
    }
    
    if (message === 'stop' || message === 'unsubscribe' || message === 'no') {
      this.optOut(from, tenantId, 'SMS request');
      return {
        response: this.renderTemplate('opt-out-confirmation', { companyName: 'Feedback Platform' }),
        action: 'opt-out'
      };
    }
    
    return { action: 'none' };
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
        delivered: Array.from(this.deliveryTracking.values()).filter(s => s.status === 'delivered').length,
        failed: Array.from(this.deliveryTracking.values()).filter(s => s.status === 'failed').length
      },
      templates: this.templates.size,
      optInStats: this.getOptInStats(),
      isConfigured: !!this.client
    };
  }
} 