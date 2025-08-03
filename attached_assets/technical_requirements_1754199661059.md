# Technical Requirements Document (TRD)
## Multi-Industry Feedback Management SaaS Platform

### Document Information
- **Version:** 1.0
- **Date:** August 2025
- **Document Type:** Technical Requirements Document
- **Project:** Multi-Industry Feedback Management Platform

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile Web    │    │   Admin Web     │    │   Management    │
│   Interface     │    │   Dashboard     │    │   Portal        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │  (Rate Limiting │
                    │  Authentication)│
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Web Server 1   │    │  Web Server 2   │    │  Web Server N   │
│   (Node.js)     │    │   (Node.js)     │    │   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Database      │
                    │  (PostgreSQL)   │
                    │  Multi-Tenant   │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Backblaze B2  │
                    │  Cloud Storage  │
                    │ (Voice/Images)  │
                    └─────────────────┘
```

### 1.2 Technology Stack

#### Frontend Technologies
- **Mobile Web Interface:** Progressive Web App (PWA)
  - HTML5, CSS3, JavaScript (ES6+)
  - Responsive framework: Tailwind CSS
  - JavaScript framework: Vue.js 3 or React 18
  - PWA features for offline capability
  - WebRTC for voice recording
  - File API for image capture

- **Admin Dashboard:** Single Page Application (SPA)
  - Vue.js 3 or React 18 with TypeScript
  - State management: Vuex/Pinia or Redux Toolkit
  - UI component library: Vuetify or Material-UI
  - Charts and analytics: Chart.js or D3.js
  - Real-time updates: WebSocket or Server-Sent Events

#### Backend Technologies
- **Application Server:** Node.js with Express.js or Fastify
- **Language:** TypeScript for type safety
- **API Architecture:** RESTful API with GraphQL for complex queries
- **Authentication:** JWT tokens with refresh token rotation
- **Real-time Communication:** Socket.io or native WebSocket
- **Background Jobs:** Bull Queue with Redis

#### Database & Storage
- **Primary Database:** PostgreSQL 14+ with row-level security
- **Caching:** Redis for session management and caching
- **File Storage:** Backblaze B2 Cloud Storage
- **Search:** PostgreSQL full-text search or Elasticsearch
- **Database Migrations:** Knex.js or Prisma

#### Infrastructure & DevOps
- **Containerization:** Docker and Docker Compose
- **Orchestration:** Kubernetes or Docker Swarm
- **CI/CD:** GitHub Actions or GitLab CI
- **Monitoring:** Prometheus + Grafana
- **Logging:** ELK Stack (Elasticsearch, Logstash, Kibana)
- **Load Balancing:** Nginx or HAProxy

---

## 2. Database Design Specifications

### 2.1 Multi-Tenant Strategy
**Row-Level Security (RLS) Approach:**
- Single database with tenant_id in all tenant-specific tables
- PostgreSQL RLS policies to enforce tenant isolation
- Connection pooling with tenant context
- Shared tables for system-wide data (user roles, system settings)

### 2.2 Database Schema Details

#### Core Tables Structure

```sql
-- Tenants table (Master tenant registry)
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    industry_type VARCHAR(100) NOT NULL,
    subscription_plan VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    contact_details JSONB,
    timezone VARCHAR(50) DEFAULT 'UTC'
);

-- Users table with tenant isolation
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    phone_number VARCHAR(20),
    preferences JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON users 
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

### 2.3 Indexing Strategy
```sql
-- Performance indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_feedback_responses_tenant_location ON feedback_responses(tenant_id, location_id);
CREATE INDEX idx_feedback_responses_submitted_at ON feedback_responses(submitted_at);
CREATE INDEX idx_custom_field_values_response_id ON custom_field_values(response_id);
CREATE INDEX idx_multimedia_files_response_id ON multimedia_files(response_id);

-- Full-text search indexes
CREATE INDEX idx_feedback_responses_text_search 
    ON feedback_responses USING gin(to_tsvector('english', feedback_text));
```

### 2.4 Data Partitioning
```sql
-- Partition feedback_responses by date for better performance
CREATE TABLE feedback_responses (
    response_id UUID DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    submitted_at TIMESTAMP NOT NULL,
    -- other columns...
    PRIMARY KEY (response_id, submitted_at)
) PARTITION BY RANGE (submitted_at);

-- Create monthly partitions
CREATE TABLE feedback_responses_2025_08 PARTITION OF feedback_responses
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
```

---

## 3. API Design Specifications

### 3.1 API Architecture
- **Base URL:** `https://api.feedbackplatform.com/v1`
- **Authentication:** Bearer token (JWT)
- **Rate Limiting:** 1000 requests/hour per tenant
- **Response Format:** JSON with consistent error handling
- **Versioning:** URL-based versioning (/v1/, /v2/)

### 3.2 Core API Endpoints

#### Authentication Endpoints
```http
POST /auth/login
POST /auth/register
POST /auth/refresh
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
```

#### Tenant Management
```http
GET    /tenants/profile
PUT    /tenants/profile
GET    /tenants/settings
PUT    /tenants/settings
POST   /tenants/invite-user
```

#### Survey Management
```http
GET    /surveys/templates
POST   /surveys/templates
PUT    /surveys/templates/{templateId}
DELETE /surveys/templates/{templateId}
GET    /surveys/custom-fields
POST   /surveys/custom-fields
PUT    /surveys/custom-fields/{fieldId}
DELETE /surveys/custom-fields/{fieldId}
```

#### QR Code Management
```http
GET    /qr-codes
POST   /qr-codes
PUT    /qr-codes/{qrCodeId}
DELETE /qr-codes/{qrCodeId}
GET    /qr-codes/{qrCodeId}/analytics
```

#### Feedback Collection
```http
GET    /feedback/form/{qrCodeId}
POST   /feedback/submit
GET    /feedback/responses
GET    /feedback/responses/{responseId}
PUT    /feedback/responses/{responseId}
DELETE /feedback/responses/{responseId}
```

#### File Management (Backblaze Integration)
```http
POST   /files/upload
GET    /files/{fileId}
DELETE /files/{fileId}
GET    /files/{fileId}/download-url
```

#### Analytics & Reporting
```http
GET    /analytics/dashboard
GET    /analytics/metrics
POST   /reports/generate
GET    /reports
GET    /reports/{reportId}/download
```

### 3.3 API Response Format
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Success message",
  "timestamp": "2025-08-03T10:30:00Z",
  "version": "1.0"
}
```

### 3.4 Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  },
  "timestamp": "2025-08-03T10:30:00Z",
  "version": "1.0"
}
```

---

## 4. Backblaze B2 Integration

### 4.1 Integration Architecture
```javascript
// Backblaze B2 Service Configuration
const B2Service = {
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
  bucketId: process.env.B2_BUCKET_ID,
  bucketName: process.env.B2_BUCKET_NAME,
  
  // File organization structure
  getFilePath: (tenantId, fileType, fileName) => {
    return `tenants/${tenantId}/${fileType}/${Date.now()}_${fileName}`;
  }
};
```

### 4.2 File Upload Process
1. **Client Side:** Capture voice/image using browser APIs
2. **Frontend:** Compress and validate file before upload
3. **Backend:** Generate signed upload URL from Backblaze
4. **Client:** Direct upload to Backblaze using signed URL
5. **Backend:** Store file metadata in database with Backblaze file ID
6. **Processing:** Background job for file processing (thumbnail generation, transcription)

### 4.3 File Management Features
```javascript
// File upload service
class FileUploadService {
  async uploadToBackblaze(file, tenantId, fileType) {
    // 1. Validate file (size, type, malware scan)
    // 2. Generate unique file path
    // 3. Get upload authorization from B2
    // 4. Upload file to B2
    // 5. Store metadata in database
    // 6. Return file URL and metadata
  }
  
  async generateSignedUrl(fileId, expirationTime = 3600) {
    // Generate time-limited access URL for secure file access
  }
  
  async deleteFile(fileId) {
    // Delete from both B2 and database
  }
}
```

### 4.4 File Storage Strategy
- **Voice Files:** MP3/WAV format, max 2 minutes, stored in `/voice/` folder
- **Images:** JPEG/PNG format, max 20MB, compressed and stored in `/images/` folder
- **Generated Reports:** PDF/CSV/Excel, stored in `/reports/` folder
- **File Naming:** `{timestamp}_{uuid}_{original_name}`
- **Lifecycle:** Auto-delete after configurable retention period

---

## 5. Security Requirements

### 5.1 Authentication & Authorization
```javascript
// JWT Token Structure
{
  "sub": "user_id",
  "tenant_id": "tenant_uuid",
  "role": "admin|manager|staff",
  "permissions": ["read:feedback", "write:surveys"],
  "iat": 1691234567,
  "exp": 1691320967,
  "iss": "feedback-platform"
}

// Role-Based Access Control
const PERMISSIONS = {
  admin: [
    'manage:users', 'manage:settings', 'manage:billing',
    'read:all', 'write:all', 'delete:all'
  ],
  manager: [
    'manage:surveys', 'manage:locations', 'manage:alerts',
    'read:feedback', 'write:feedback', 'export:reports'
  ],
  staff: [
    'read:feedback', 'respond:feedback', 'view:analytics'
  ]
};
```

### 5.2 Data Encryption
```javascript
// Encryption Service
class EncryptionService {
  // Encrypt sensitive customer data
  static encryptPII(data) {
    return crypto.encrypt(data, process.env.ENCRYPTION_KEY);
  }
  
  // Database field encryption for PII
  static encryptFields = [
    'customer_email', 'customer_phone', 'customer_name'
  ];
  
  // Backblaze file encryption
  static encryptFile(buffer) {
    return crypto.encrypt(buffer, process.env.FILE_ENCRYPTION_KEY);
  }
}
```

### 5.3 Input Validation & Sanitization
```javascript
// Request validation schemas
const feedbackSchema = {
  customer_name: Joi.string().min(2).max(100).required(),
  customer_email: Joi.string().email().optional(),
  customer_phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).optional(),
  overall_rating: Joi.number().min(1).max(5).required(),
  feedback_text: Joi.string().max(5000).optional(),
  custom_fields: Joi.object().pattern(
    Joi.string().uuid(),
    Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
  )
};
```

### 5.4 Security Headers & Middleware
```javascript
// Security middleware configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting by tenant
const createRateLimiter = (windowMs, max) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => `${req.user.tenant_id}:${req.ip}`,
    message: 'Too many requests from this tenant'
  });
};
```

---

## 6. Performance Specifications

### 6.1 Response Time Requirements
- **API Endpoints:** < 200ms for 95% of requests
- **Database Queries:** < 100ms for simple queries, < 500ms for complex analytics
- **File Uploads:** < 10 seconds for 20MB files
- **Page Load Times:** < 3 seconds for initial load, < 1 second for subsequent pages

### 6.2 Caching Strategy
```javascript
// Redis caching implementation
class CacheService {
  // Cache frequently accessed data
  static cacheKeys = {
    userSession: (userId) => `session:${userId}`,
    tenantSettings: (tenantId) => `tenant:${tenantId}:settings`,
    surveyTemplate: (templateId) => `template:${templateId}`,
    analytics: (tenantId, period) => `analytics:${tenantId}:${period}`
  };
  
  static async cacheAnalytics(tenantId, period, data) {
    const key = this.cacheKeys.analytics(tenantId, period);
    await redis.setex(key, 3600, JSON.stringify(data)); // 1 hour cache
  }
  
  static async getCachedAnalytics(tenantId, period) {
    const key = this.cacheKeys.analytics(tenantId, period);
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
}
```

### 6.3 Database Optimization
```sql
-- Connection pooling configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  pool: {
    min: 5,
    max: 20,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200
  }
};

-- Query optimization examples
-- Use prepared statements
PREPARE get_feedback_by_tenant AS 
SELECT * FROM feedback_responses 
WHERE tenant_id = $1 AND submitted_at >= $2 
ORDER BY submitted_at DESC LIMIT $3;

-- Materialized views for analytics
CREATE MATERIALIZED VIEW tenant_analytics_daily AS
SELECT 
  tenant_id,
  DATE(submitted_at) as date,
  COUNT(*) as total_responses,
  AVG(overall_rating) as avg_rating,
  COUNT(CASE WHEN overall_rating <= 2 THEN 1 END) as negative_responses
FROM feedback_responses
GROUP BY tenant_id, DATE(submitted_at);

-- Refresh materialized views via background job
REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_analytics_daily;
```

---

## 7. Scalability Architecture

### 7.1 Horizontal Scaling Strategy
```yaml
# Kubernetes deployment configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: feedback-platform-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: feedback-platform-api
  template:
    metadata:
      labels:
        app: feedback-platform-api
    spec:
      containers:
      - name: api
        image: feedback-platform:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: feedback-platform-service
spec:
  selector:
    app: feedback-platform-api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### 7.2 Auto-scaling Configuration
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: feedback-platform-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: feedback-platform-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 7.3 Database Scaling
```javascript
// Read replica configuration
const dbConfig = {
  master: {
    host: process.env.DB_MASTER_HOST,
    // ... master config
  },
  slaves: [
    { host: process.env.DB_SLAVE_1_HOST },
    { host: process.env.DB_SLAVE_2_HOST }
  ]
};

// Query routing
class DatabaseService {
  static async executeQuery(query, params, options = {}) {
    const isReadQuery = query.trim().toLowerCase().startsWith('select');
    const connection = isReadQuery && !options.forceMaster 
      ? this.getSlaveConnection() 
      : this.getMasterConnection();
    
    return await connection.query(query, params);
  }
  
  static getSlaveConnection() {
    // Round-robin load balancing for read queries
    const slaveIndex = Math.floor(Math.random() * this.slaves.length);
    return this.slaves[slaveIndex];
  }
}
```

---

## 8. Integration Specifications

### 8.1 Third-Party API Integrations

#### Google Reviews API Integration
```javascript
class GoogleReviewsService {
  constructor(apiKey, placeId) {
    this.apiKey = apiKey;
    this.placeId = placeId;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
  }
  
  async fetchReviews() {
    const response = await fetch(
      `${this.baseUrl}/details/json?place_id=${this.placeId}&fields=reviews&key=${this.apiKey}`
    );
    const data = await response.json();
    return this.transformReviews(data.result.reviews);
  }
  
  transformReviews(reviews) {
    return reviews.map(review => ({
      external_review_id: review.author_name + review.time,
      reviewer_name: review.author_name,
      rating: review.rating,
      review_text: review.text,
      review_date: new Date(review.time * 1000),
      platform_data: {
        author_url: review.author_url,
        profile_photo_url: review.profile_photo_url,
        relative_time_description: review.relative_time_description
      }
    }));
  }
}
```

#### Yelp API Integration
```javascript
class YelpService {
  constructor(apiKey, businessId) {
    this.apiKey = apiKey;
    this.businessId = businessId;
    this.baseUrl = 'https://api.yelp.com/v3';
  }
  
  async fetchReviews() {
    const response = await fetch(
      `${this.baseUrl}/businesses/${this.businessId}/reviews`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );
    const data = await response.json();
    return this.transformReviews(data.reviews);
  }
}
```

### 8.2 Notification Services Integration
```javascript
// SMS Service (Twilio)
class SMSService {
  static async sendSMS(to, message) {
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    
    return await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
  }
}

// Email Service (SendGrid)
class EmailService {
  static async sendEmail(to, subject, content) {
    const msg = {
      to,
      from: process.env.FROM_EMAIL,
      subject,
      html: content
    };
    
    return await sgMail.send(msg);
  }
}

// Push Notification Service
class PushNotificationService {
  static async sendPushNotification(userId, title, body, data) {
    // Implementation for web push notifications
    const subscription = await getUserPushSubscription(userId);
    
    const payload = JSON.stringify({
      title,
      body,
      data,
      icon: '/icons/notification-icon.png',
      badge: '/icons/notification-badge.png'
    });
    
    return await webpush.sendNotification(subscription, payload);
  }
}
```

---

## 9. Monitoring & Logging

### 9.1 Application Monitoring
```javascript
// Prometheus metrics
const promClient = require('prom-client');

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'tenant_id'],
  buckets: [0.1, 5, 15, 50, 100, 500]
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['tenant_id']
});

// Middleware for tracking metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, req.user?.tenant_id)
      .observe(duration);
  });
  
  next();
};
```

### 9.2 Structured Logging
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'feedback-platform' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Structured logging for business events
class AuditLogger {
  static logFeedbackSubmission(tenantId, responseId, metadata) {
    logger.info('Feedback submitted', {
      event: 'feedback_submission',
      tenant_id: tenantId,
      response_id: responseId,
      timestamp: new Date().toISOString(),
      metadata
    });
  }
  
  static logUserAction(userId, tenantId, action, resource) {
    logger.info('User action', {
      event: 'user_action',
      user_id: userId,
      tenant_id: tenantId,
      action,
      resource,
      timestamp: new Date().toISOString()
    });
  }
}
```

---

## 10. Deployment & DevOps

### 10.1 CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run linting
        run: npm run lint
      - name: Security audit
        run: npm audit

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t feedback-platform:${{ github.sha }} .
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push feedback-platform:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/feedback-platform-api api=feedback-platform:${{ github.sha }}
          kubectl rollout status deployment/feedback-platform-api
```

### 10.2 Environment Configuration
```javascript
// config/environment.js
const config = {
  development: {
    database: {
      host: 'localhost',
      port: 5432,
      database: 'feedback_dev',
      ssl: false
    },
    redis: {
      host: 'localhost',
      port: 6379
    },
    backblaze: {
      endpoint: 'https://s3.us-west-000.backblazeb2.com',
      bucket: 'feedback-dev-bucket'
    }
  },
  production: {
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD
    },
    backblaze: {
      endpoint: process.env.B2_ENDPOINT,
      bucket: process.env.B2_BUCKET_NAME
    }
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
```

---

## 11. Testing Strategy

### 11.1 Testing Pyramid
```javascript
// Unit Tests
describe('FeedbackService', () => {
  test('should create feedback response', async () => {
    const mockData = {
      tenant_id: 'uuid',
      customer_name: 'John Doe',
      overall_rating: 5,
      feedback_text: 'Great service!'
    };
    
    const result = await FeedbackService.createResponse(mockData);
    expect(result).toHaveProperty('response_id');
    expect(result.overall_rating).toBe(5);
  });
});

// Integration Tests
describe('Feedback API Integration', () => {
  test('should submit feedback via API', async () => {
    const response = await request(app)
      .post('/api/v1/feedback/submit')
      .send(validFeedbackData)
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('response_id');
  });
});

// End-to-End Tests (Playwright)
test('complete feedback submission flow', async ({ page }) => {
  await page.goto('/feedback/qr123');
  await page.fill('[data-testid="customer-name"]', 'John Doe');
  await page.click('[data-testid="rating-5"]');
  await page.fill('[data-testid="feedback-text"]', 'Excellent service!');
  await page.click('[data-testid="submit-button"]');
  
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

### 11.2 Performance Testing
```javascript
// Load testing with Artillery
module.exports = {
  config: {
    target: 'https://api.feedbackplatform.com',
    phases: [
      { duration: 60, arrivalRate: 10 },
      { duration: 120, arrivalRate: 20 },
      { duration: 60, arrivalRate: 10 }
    ]
  },
  scenarios: [
    {
      name: 'Submit feedback',
      weight: 70,
      flow: [
        {
          post: {
            url: '/v1/feedback/submit',
            headers: {
              'Authorization': 'Bearer {{ token }}'
            },
            json: {
              customer_name: 'Load Test User',
              overall_rating: 4,
              feedback_text: 'Load testing feedback'
            }
          }
        }
      ]
    }
  ]
};
```

---

## 12. Maintenance & Support

### 12.1 Database Maintenance
```sql
-- Automated maintenance tasks
-- Daily vacuum and analyze
SELECT cron.schedule('vacuum-analyze', '0 2 * * *', 'VACUUM ANALYZE;');

-- Weekly full backup
SELECT cron.schedule('weekly-backup', '0 1 * * 0', 
  'pg_dump feedback_platform > /backups/weekly_$(date +%Y%m%d).sql');

-- Monthly partition cleanup (keep 12 months)
SELECT cron.schedule('partition-cleanup', '0 3 1 * *', 
  'DROP TABLE IF EXISTS feedback_responses_' || 
  to_char(CURRENT_DATE - INTERVAL ''13 months'', ''YYYY_MM'') || ';');
```

### 12.2 Monitoring Alerts
```yaml
# Prometheus alerting rules
groups:
- name: feedback-platform-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    annotations:
      summary: High error rate detected
      
  - alert: DatabaseConnectionsHigh
    expr: pg_stat_activity_count > 80
    for: 2m
    annotations:
      summary: Database connection count is high
      
  - alert: DiskSpaceHigh
    expr: (node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes > 0.85
    for: 5m
    annotations:
      summary: Disk space usage is above 85%
```

---

## 13. Security Compliance

### 13.1 GDPR Compliance Implementation
```javascript
class GDPRService {
  // Right to access
  static async exportUserData(userId) {
    const userData = await db.query(`
      SELECT * FROM users WHERE user_id = $1
      UNION ALL
      SELECT * FROM feedback_responses WHERE customer_email = 
        (SELECT email FROM users WHERE user_id = $1)
    `, [userId]);
    
    return {
      personal_data: userData,
      exported_at: new Date().toISOString(),
      format: 'JSON'
    };
  }
  
  // Right to be forgotten
  static async deleteUserData(userId) {
    await db.transaction(async (trx) => {
      // Anonymize feedback responses
      await trx.query(`
        UPDATE feedback_responses 
        SET customer_name = 'Anonymous', 
            customer_email = null, 
            customer_phone = null
        WHERE customer_email = (SELECT email FROM users WHERE user_id = $1)
      `, [userId]);
      
      // Delete user account
      await trx.query('DELETE FROM users WHERE user_id = $1', [userId]);
    });
  }
  
  // Consent management
  static async updateConsent(userId, consentType, granted) {
    await db.query(`
      INSERT INTO user_consents (user_id, consent_type, granted, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, consent_type) 
      DO UPDATE SET granted = $3, updated_at = CURRENT_TIMESTAMP
    `, [userId, consentType, granted]);
  }
}
```

This comprehensive Technical Requirements Document provides your development team with detailed specifications for implementing the multi-industry feedback management platform. The document covers all technical aspects from architecture to deployment, ensuring a robust and scalable solution with proper Backblaze B2 integration.
  "