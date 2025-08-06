import { AlertRule, FeedbackResponse } from '@shared/schema';

export interface AlertCondition {
  type: 'rating_threshold' | 'keyword_detection' | 'volume_based' | 'time_based' | 'custom';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'contains' | 'not_contains' | 'regex';
  field: string;
  value: any;
  additionalParams?: Record<string, any>;
}

export interface AlertAction {
  type: 'email' | 'sms' | 'webhook' | 'notification' | 'escalation';
  recipients?: string[];
  phoneNumbers?: string[];
  url?: string;
  template?: string;
  delay?: number; // Delay in minutes before sending
  retryCount?: number;
  retryInterval?: number; // Minutes between retries
}

export interface AlertRuleConfig {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  isActive: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cooldownPeriod?: number; // Minutes between alerts for the same rule
  lastTriggered?: Date;
}

export interface AlertEvaluationResult {
  triggered: boolean;
  matchedConditions: AlertCondition[];
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data: any;
}

export class AlertRuleEngine {
  private rules: Map<string, AlertRuleConfig> = new Map();
  private cooldownTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Start cleanup interval for cooldown timers
    setInterval(() => {
      this.cleanupExpiredCooldowns();
    }, 60000); // Check every minute
  }

  // Add or update a rule
  public addRule(rule: AlertRuleConfig): void {
    this.rules.set(rule.id, rule);
  }

  // Remove a rule
  public removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    // Clear any cooldown timer
    const timer = this.cooldownTimers.get(ruleId);
    if (timer) {
      clearTimeout(timer);
      this.cooldownTimers.delete(ruleId);
    }
  }

  // Get all rules for a tenant
  public getRulesForTenant(tenantId: string): AlertRuleConfig[] {
    return Array.from(this.rules.values()).filter(rule => rule.tenantId === tenantId);
  }

  // Evaluate feedback against all active rules
  public async evaluateFeedback(feedback: FeedbackResponse, tenantId: string): Promise<AlertEvaluationResult[]> {
    const results: AlertEvaluationResult[] = [];
    const tenantRules = this.getRulesForTenant(tenantId);

    for (const rule of tenantRules) {
      if (!rule.isActive) continue;

      // Check cooldown period
      if (this.isInCooldown(rule)) continue;

      const result = await this.evaluateRule(rule, feedback);
      if (result.triggered) {
        results.push(result);
        
        // Set cooldown timer if specified
        if (rule.cooldownPeriod) {
          this.setCooldown(rule.id, rule.cooldownPeriod);
        }
      }
    }

    return results;
  }

  // Evaluate a single rule against feedback
  private async evaluateRule(rule: AlertRuleConfig, feedback: FeedbackResponse): Promise<AlertEvaluationResult> {
    const matchedConditions: AlertCondition[] = [];
    let allConditionsMet = true;

    for (const condition of rule.conditions) {
      const isMet = await this.evaluateCondition(condition, feedback);
      if (isMet) {
        matchedConditions.push(condition);
      } else {
        allConditionsMet = false;
        break; // All conditions must be met (AND logic)
      }
    }

    if (!allConditionsMet) {
      return {
        triggered: false,
        matchedConditions: [],
        severity: 'info',
        message: '',
        data: {}
      };
    }

    // Determine severity based on rule priority and conditions
    const severity = this.determineSeverity(rule, matchedConditions, feedback);
    
    // Generate alert message
    const message = this.generateAlertMessage(rule, matchedConditions, feedback);

    return {
      triggered: true,
      matchedConditions,
      severity,
      message,
      data: {
        ruleId: rule.id,
        ruleName: rule.name,
        feedbackId: feedback.id,
        customerName: feedback.customerName,
        rating: feedback.overallRating,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Evaluate a single condition
  private async evaluateCondition(condition: AlertCondition, feedback: FeedbackResponse): Promise<boolean> {
    switch (condition.type) {
      case 'rating_threshold':
        return this.evaluateRatingThreshold(condition, feedback);
      
      case 'keyword_detection':
        return this.evaluateKeywordDetection(condition, feedback);
      
      case 'volume_based':
        return await this.evaluateVolumeBased(condition, feedback);
      
      case 'time_based':
        return await this.evaluateTimeBased(condition, feedback);
      
      case 'custom':
        return this.evaluateCustomCondition(condition, feedback);
      
      default:
        console.warn(`Unknown condition type: ${condition.type}`);
        return false;
    }
  }

  // Evaluate rating threshold conditions
  private evaluateRatingThreshold(condition: AlertCondition, feedback: FeedbackResponse): boolean {
    const fieldValue = this.getFieldValue(feedback, condition.field);
    const threshold = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === threshold;
      case 'not_equals':
        return fieldValue !== threshold;
      case 'greater_than':
        return fieldValue > threshold;
      case 'less_than':
        return fieldValue < threshold;
      case 'greater_than_or_equal':
        return fieldValue >= threshold;
      case 'less_than_or_equal':
        return fieldValue <= threshold;
      default:
        return false;
    }
  }

  // Evaluate keyword detection conditions
  private evaluateKeywordDetection(condition: AlertCondition, feedback: FeedbackResponse): boolean {
    const text = this.getFieldValue(feedback, condition.field);
    if (typeof text !== 'string') return false;

    const keywords = Array.isArray(condition.value) ? condition.value : [condition.value];
    const searchText = text.toLowerCase();

    switch (condition.operator) {
      case 'contains':
        return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
      case 'not_contains':
        return !keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
      case 'regex':
        try {
          const regex = new RegExp(condition.value, 'i');
          return regex.test(searchText);
        } catch (error) {
          console.error('Invalid regex pattern:', condition.value);
          return false;
        }
      default:
        return false;
    }
  }

  // Evaluate volume-based conditions
  private async evaluateVolumeBased(condition: AlertCondition, feedback: FeedbackResponse): Promise<boolean> {
    // This would typically query the database for recent feedback volume
    // For now, we'll implement a simple version
    const timeWindow = condition.additionalParams?.timeWindow || 60; // minutes
    const threshold = condition.value;
    
    // In a real implementation, you would query the database here
    // For now, we'll return false to avoid complexity
    console.log(`Volume-based condition evaluation would check for ${threshold} feedbacks in ${timeWindow} minutes`);
    return false;
  }

  // Evaluate time-based conditions
  private async evaluateTimeBased(condition: AlertCondition, feedback: FeedbackResponse): Promise<boolean> {
    const timeWindow = condition.additionalParams?.timeWindow || 60; // minutes
    const threshold = condition.value;
    
    // Check if no feedback has been received in the specified time window
    const cutoffTime = new Date(Date.now() - (timeWindow * 60 * 1000));
    
    // In a real implementation, you would query the database here
    // For now, we'll return false to avoid complexity
    console.log(`Time-based condition evaluation would check for feedback since ${cutoffTime}`);
    return false;
  }

  // Evaluate custom conditions
  private evaluateCustomCondition(condition: AlertCondition, feedback: FeedbackResponse): boolean {
    // Custom conditions can be implemented with JavaScript expressions
    // This is a simplified version - in production, you'd want proper sandboxing
    try {
      const customFunction = new Function('feedback', 'condition', condition.value);
      return customFunction(feedback, condition);
    } catch (error) {
      console.error('Error evaluating custom condition:', error);
      return false;
    }
  }

  // Get field value from feedback object
  private getFieldValue(feedback: FeedbackResponse, field: string): any {
    const fieldMap: Record<string, any> = {
      'overallRating': feedback.overallRating,
      'feedbackText': feedback.feedbackText,
      'customerName': feedback.customerName,
      'customerEmail': feedback.customerEmail,
      'isAnonymous': feedback.isAnonymous,
      'isPublic': feedback.isPublic,
      'hasVoiceRecording': !!feedback.voiceRecordingUrl,
      'hasImages': feedback.imageUrls && feedback.imageUrls.length > 0,
      'createdAt': feedback.createdAt,
      'locationId': feedback.locationId,
      'qrCodeId': feedback.qrCodeId
    };

    return fieldMap[field] || null;
  }

  // Determine alert severity
  private determineSeverity(rule: AlertRuleConfig, conditions: AlertCondition[], feedback: FeedbackResponse): 'info' | 'warning' | 'critical' {
    // Start with rule priority
    let severity: 'info' | 'warning' | 'critical' = 'info';
    
    switch (rule.priority) {
      case 'critical':
        severity = 'critical';
        break;
      case 'high':
        severity = 'warning';
        break;
      case 'medium':
        severity = 'warning';
        break;
      case 'low':
        severity = 'info';
        break;
    }

    // Adjust based on rating if it's a rating-based alert
    const ratingCondition = conditions.find(c => c.type === 'rating_threshold' && c.field === 'overallRating');
    if (ratingCondition) {
      const rating = feedback.overallRating;
      if (rating <= 1) severity = 'critical';
      else if (rating <= 2) severity = 'critical';
      else if (rating <= 3) severity = 'warning';
    }

    return severity;
  }

  // Generate alert message
  private generateAlertMessage(rule: AlertRuleConfig, conditions: AlertCondition[], feedback: FeedbackResponse): string {
    let message = `${rule.name}: `;
    
    const ratingCondition = conditions.find(c => c.type === 'rating_threshold' && c.field === 'overallRating');
    if (ratingCondition) {
      message += `Customer gave a rating of ${feedback.overallRating}/5`;
    }

    const keywordCondition = conditions.find(c => c.type === 'keyword_detection');
    if (keywordCondition) {
      message += `Feedback contains keywords: ${Array.isArray(keywordCondition.value) ? keywordCondition.value.join(', ') : keywordCondition.value}`;
    }

    if (feedback.customerName) {
      message += ` (Customer: ${feedback.customerName})`;
    }

    return message;
  }

  // Cooldown management
  private isInCooldown(rule: AlertRuleConfig): boolean {
    if (!rule.cooldownPeriod || !rule.lastTriggered) return false;
    
    const cooldownEnd = new Date(rule.lastTriggered.getTime() + (rule.cooldownPeriod * 60 * 1000));
    return new Date() < cooldownEnd;
  }

  private setCooldown(ruleId: string, cooldownPeriod: number): void {
    // Clear existing timer
    const existingTimer = this.cooldownTimers.get(ruleId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.cooldownTimers.delete(ruleId);
    }, cooldownPeriod * 60 * 1000);

    this.cooldownTimers.set(ruleId, timer);
  }

  private cleanupExpiredCooldowns(): void {
    const now = Date.now();
    for (const [ruleId, timer] of this.cooldownTimers.entries()) {
      // Check if timer has expired (this is a simplified check)
      // In a real implementation, you'd track the actual expiration time
      if (timer.hasRef && !timer.ref()) {
        this.cooldownTimers.delete(ruleId);
      }
    }
  }

  // Load rules from database
  public async loadRulesFromDatabase(rules: AlertRule[]): void {
    for (const rule of rules) {
      try {
        const config: AlertRuleConfig = {
          id: rule.id,
          name: rule.name,
          description: rule.description || undefined,
          tenantId: rule.tenantId,
          conditions: rule.conditions as AlertCondition[],
          actions: rule.actions as AlertAction[],
          isActive: rule.isActive,
          priority: 'medium', // Default priority
          cooldownPeriod: 30, // Default 30 minutes
          lastTriggered: undefined
        };
        
        this.addRule(config);
      } catch (error) {
        console.error(`Error loading rule ${rule.id}:`, error);
      }
    }
  }

  // Get engine statistics
  public getStats(): any {
    return {
      totalRules: this.rules.size,
      activeRules: Array.from(this.rules.values()).filter(r => r.isActive).length,
      cooldownTimers: this.cooldownTimers.size,
      tenants: Array.from(new Set(Array.from(this.rules.values()).map(r => r.tenantId)))
    };
  }
} 