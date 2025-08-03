# System Architecture Document
## Multi-Industry Feedback Management SaaS Platform

### Document Information
- **Version:** 1.0
- **Date:** August 2025
- **Document Type:** System Architecture Document
- **Project:** Multi-Industry Feedback Management Platform

---

## 1. Architecture Overview

### 1.1 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   Customer      │  │   Business      │  │   Admin         │                │
│  │   Mobile Web    │  │   Dashboard     │  │   Portal        │                │
│  │   (PWA)         │  │   (SPA)         │  │   (Web App)     │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                API GATEWAY                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  • Authentication & Authorization    • Rate Limiting                           │
│  • Request Routing                   • API Versioning                          │
│  • SSL Termination                   • Request/Response Logging                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              LOAD BALANCER                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  • Traffic Distribution              • Health Checks                           │
│  • Session Affinity                  • Failover Management                     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             APPLICATION LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │   Auth      │ │  Feedback   │ │  Analytics  │ │ Notification│                │
│ │  Service    │ │  Service    │ │  Service    │ │   Service   │                │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘                │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │   QR Code   │ │   Report    │ │   File      │ │  Integration│                │
│ │  Service    │ │  Service    │ │  Service    │ │   Service   │                │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               DATA LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │ PostgreSQL  │ │    Redis    │ │ Backblaze   │ │ Message     │                │
│ │ (Primary)   │ │   Cache     │ │    B2       │ │   Queue     │                │
│ │             │ │             │ │ (Files)     │ │  (Redis)    │                │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL INTEGRATIONS                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │   Google    │ │    Yelp     │ │ TripAdvisor │ │   Twilio    │                │
│ │  Reviews    │ │     API     │ │     API     │ │   (SMS)     │                │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘                │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │  SendGrid   │ │   Stripe    │ │ Monitoring  │ │   CDN       │                │
│ │  (Email)    │ │ (Payment)   │ │  Services   │ │  Service    │                │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Microservices Architecture

The system follows a microservices architecture pattern with the following core services:

#### Core Services
1. **Authentication Service** - User management, JWT tokens, RBAC
2. **Tenant Management Service** - Multi-tenant operations, billing
3. **Survey Service** - Template management, custom fields
4. **Feedback Collection Service** - Response handling, validation
5. **QR Code Service** - Generation, tracking, analytics
6. **File Management Service** - Backblaze B2 integration
7. **Analytics Service** - Data processing, metrics calculation
8. **Notification Service** - Alerts, emails, SMS
9. **Reporting Service** - Report generation, exports
10. **Integration Service** - Third-party API management

---

## 2. Component Details

### 2.1 Frontend Architecture

#### Customer Mobile Interface (PWA)
```javascript
// Progressive Web App Architecture
const PWAArchitecture = {
  framework: "Vue.js 3 / React 18",
  stateManagement: "Vuex/Pinia / Redux Toolkit",
  routing: "Vue Router / React Router",
  ui: "Tailwind CSS + Custom Components",
  features: {
    offline: "Service Worker + IndexedDB",
    camera: "MediaDevices API",
    audio: "MediaRecorder API",
    geolocation: "Geolocation API",
    push: "Web Push API",
    storage: "Local Storage + Session Storage"
  },
  performance: {
    bundling: "Vite / Webpack",
    codesplitting: "Route-based splitting",
    caching: "Service Worker caching strategy",
    compression: "Gzip + Brotli"
  }
};
```

#### Business Dashboard (SPA)
```javascript
// Single Page Application Architecture
const DashboardArchitecture = {
  framework: "Vue.js 3 with TypeScript",
  components: {
    charts: "Chart.js / D3.js",
    tables: "Vue Good Table / AG Grid",
    forms: "Vuelidate / VeeValidate",
    notifications: "Vue Toastification"
  },
  realtime: {
    websockets: "Socket.io client",
    polling: "Axios with intervals",
    updates: "EventSource (SSE)"
  },
  security: {
    authentication: "JWT tokens",
    authorization: "Route guards",
    xss: "DOMPurify sanitization"
  }
};
```

### 2.2 API Gateway Architecture

```javascript
// API Gateway Configuration
const APIGatewayConfig = {
  technology: "Kong / AWS API Gateway / Custom Express.js",
  features: {
    authentication: {
      jwt: "JWT token validation",
      oauth: "OAuth 2.0 / OpenID Connect",
      apiKeys: "API key management"
    },
    rateLimit: {
      tenant: "Per-tenant rate limiting",
      endpoint: "Per-endpoint limits",
      user: "Per-user limits",
      global: "Global rate limiting"
    },
    routing: {
      versioning: "URL-based versioning (/v1, /v2)",
      loadBalancing: "Round-robin, least-connections",
      healthChecks: "Service health monitoring"
    },
    monitoring: {
      logging: "Request/response logging",
      metrics: "Prometheus metrics",
      tracing: "Distributed tracing"
    }
  }
};
```

### 2.3 Microservices Communication

```javascript
// Service Communication Patterns
const CommunicationPatterns = {
  synchronous: {
    protocol: "HTTP/HTTPS REST APIs",
    format: "JSON",
    timeout: "30 seconds max",
    retries: "Exponential backoff"
  },
  asynchronous: {
    messageQueue: "Redis Bull Queue",
    events: "Event-driven architecture",
    patterns: ["Publish/Subscribe", "Request/Reply", "Fire and Forget"]
  },
  serviceDiscovery: {
    method: "DNS-based / Consul",
    healthChecks: "HTTP health endpoints",
    loadBalancing: "Client-side load balancing"
  }
};
```

---

## 3. Data Architecture

### 3.1 Multi-Tenant Database Strategy

```sql
-- Multi-tenant isolation strategy
CREATE SCHEMA tenant_isolation;

-- Row Level Security (RLS) implementation
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $
BEGIN
  RETURN current_setting('app.current_tenant_id', true)::UUID;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenant isolation policy
CREATE POLICY tenant_isolation ON feedback_responses
  FOR ALL TO application_role
  USING (tenant_id = get_current_tenant_id());

-- Connection pooling with tenant context
const TenantConnectionPool = {
  strategy: "Single pool with tenant context",
  implementation: {
    beforeQuery: "SET app.current_tenant_id = $1",
    afterQuery: "RESET app.current_tenant_id",
    poolSize: "5-20 connections per instance"
  }
};
```

### 3.2 Data Partitioning Strategy

```sql
-- Horizontal partitioning for large tables
CREATE TABLE feedback_responses (
    response_id UUID DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- other columns
    PRIMARY KEY (response_id, submitted_at)
) PARTITION BY RANGE (submitted_at);

-- Automated partition creation
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $
DECLARE
    start_date date;
    end_date date;
    partition_name text;
BEGIN
    start_date := date_trunc('month', CURRENT_DATE);
    end_date := start_date + interval '1 month';
    partition_name := 'feedback_responses_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF feedback_responses
                   FOR VALUES FROM (%L) TO (%L)',
                   partition_name, start_date, end_date);
END;
$ LANGUAGE plpgsql;

-- Schedule partition creation
SELECT cron.schedule('create-partitions', '0 0 25 * *', 'SELECT create_monthly_partition();');
```

### 3.3 Caching Architecture

```javascript
// Multi-layer caching strategy
const CachingLayers = {
  l1_application: {
    type: "In-memory (Node.js)",
    ttl: "5-60 seconds",
    data: ["Active sessions", "Frequently accessed configs"]
  },
  l2_distributed: {
    type: "Redis Cluster",
    ttl: "1 minute - 24 hours",
    data: ["User sessions", "Analytics data", "API responses"]
  },
  l3_cdn: {
    type: "CloudFlare / AWS CloudFront",
    ttl: "1 hour - 30 days",
    data: ["Static assets", "Public content", "Generated reports"]
  },
  cacheInvalidation: {
    strategy: "Event-driven invalidation",
    patterns: ["Cache-aside", "Write-through", "Write-behind"]
  }
};

// Redis caching implementation
class CacheManager {
  static async get(key, fallback) {
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached);
      
      const fresh = await fallback();
      await this.set(key, fresh, 3600); // 1 hour TTL
      return fresh;
    } catch (error) {
      console.error('Cache error:', error);
      return await fallback();
    }
  }
  
  static async set(key, value, ttl = 3600) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  static async invalidatePattern(pattern) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

---

## 4. Backblaze B2 Integration Architecture

### 4.1 File Storage Strategy

```javascript
// Backblaze B2 Service Architecture
class BackblazeB2Service {
  constructor() {
    this.bucketStructure = {
      root: "feedback-platform-prod",
      structure: {
        tenants: "{tenant_id}",
        files: {
          voice: "voice/{year}/{month}/",
          images: "images/{year}/{month}/",
          reports: "reports/{year}/{month}/",
          exports: "exports/{type}/"
        }
      }
    };
  }
  
  generateFilePath(tenantId, fileType, filename) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    return `tenants/${tenantId}/${fileType}/${year}/${month}/${Date.now()}_${filename}`;
  }
  
  async uploadFile(file, tenantId, fileType) {
    // 1. Validate file
    this.validateFile(file, fileType);
    
    // 2. Generate unique path
    const filePath = this.generateFilePath(tenantId, fileType, file.name);
    
    // 3. Get upload authorization
    const uploadAuth = await this.getUploadAuthorization();
    
    // 4. Upload to B2
    const uploadResult = await this.directUpload(file, filePath, uploadAuth);
    
    // 5. Store metadata in database
    const metadata = await this.storeFileMetadata({
      filePath,
      tenantId,
      fileType,
      size: file.size,
      mimeType: file.type,
      backblazeFileId: uploadResult.fileId,
      backblazeUrl: uploadResult.downloadUrl
    });
    
    return metadata;
  }
  
  validateFile(file, fileType) {
    const limits = {
      voice: { maxSize: 10 * 1024 * 1024, types: ['audio/mpeg', 'audio/wav'] }, // 10MB
      image: { maxSize: 20 * 1024 * 1024, types: ['image/jpeg', 'image/png'] }  // 20MB
    };
    
    const limit = limits[fileType];
    if (!limit) throw new Error('Invalid file type');
    if (file.size > limit.maxSize) throw new Error('File too large');
    if (!limit.types.includes(file.type)) throw new Error('Invalid MIME type');
  }
}
```

### 4.2 CDN Integration

```javascript
// CDN Configuration for B2
const CDNConfig = {
  provider: "CloudFlare",
  configuration: {
    origin: "s3.us-west-004.backblazeb2.com",
    caching: {
      images: "30 days",
      voice: "7 days",
      reports: "1 day"
    },
    compression: "Auto (Gzip/Brotli)",
    security: {
      hotlinkProtection: true,
      accessControl: "Signed URLs for sensitive content"
    }
  },
  
  // Generate signed URLs for secure access
  generateSignedUrl(filePath, expirationMinutes = 60) {
    const expiration = Date.now() + (expirationMinutes * 60 * 1000);
    const signature = crypto
      .createHmac('sha256', process.env.CDN_SECRET)
      .update(`${filePath}${expiration}`)
      .digest('hex');
    
    return `https://cdn.feedbackplatform.com/${filePath}?expires=${expiration}&signature=${signature}`;
  }
};
```

---

## 5. Security Architecture

### 5.1 Authentication & Authorization

```javascript
// JWT-based Authentication Architecture
const AuthArchitecture = {
  tokenStrategy: {
    accessToken: {
      lifespan: "15 minutes",
      storage: "Memory (httpOnly cookie preferred)",
      payload: ["user_id", "tenant_id", "role", "permissions"]
    },
    refreshToken: {
      lifespan: "7 days",
      storage: "httpOnly secure cookie",
      rotation: "On each refresh"
    }
  },
  
  authorization: {
    model: "RBAC (Role-Based Access Control)",
    permissions: {
      granularity: "Resource and action level",
      inheritance: "Role-based permission inheritance",
      evaluation: "Real-time permission checking"
    }
  },
  
  multiTenant: {
    isolation: "Tenant ID in all JWT tokens",
    validation: "Every request validates tenant access",
    crossTenant: "Strictly prohibited"
  }
};

// Permission system implementation
class PermissionSystem {
  static roles = {
    admin: [
      'tenant:manage', 'user:create', 'user:delete', 'survey:manage',
      'feedback:read', 'feedback:delete', 'analytics:view', 'billing:manage'
    ],
    manager: [
      'survey:manage', 'feedback:read', 'feedback:respond', 
      'analytics:view', 'location:manage', 'alert:manage'
    ],
    staff: [
      'feedback:read', 'feedback:respond', 'survey:view'
    ]
  };
  
  static checkPermission(userRole, permission) {
    return this.roles[userRole]?.includes(permission) || false;
  }
  
  static middleware(requiredPermission) {
    return (req, res, next) => {
      if (!this.checkPermission(req.user.role, requiredPermission)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
  }
}
```

### 5.2 Data Encryption

```javascript
// Encryption Architecture
const EncryptionStrategy = {
  atRest: {
    database: "PostgreSQL TDE (Transparent Data Encryption)",
    files: "AES-256 encryption before B2 upload",
    backups: "Encrypted backup files"
  },
  inTransit: {
    api: "TLS 1.3 for all API communication",
    internal: "mTLS for service-to-service",
    files: "HTTPS for all file transfers"
  },
  application: {
    pii: "AES-256 field-level encryption",
    passwords: "bcrypt with salt rounds 12",
    tokens: "HMAC-SHA256 signing"
  }
};

// Field-level encryption service
class FieldEncryption {
  static encrypt(plaintext) {
    const cipher = crypto.createCipher('aes-256-gcm', process.env.ENCRYPTION_KEY);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${encrypted}:${authTag.toString('hex')}`;
  }
  
  static decrypt(ciphertext) {
    const [encrypted, authTag] = ciphertext.split(':');
    const decipher = crypto.createDecipher('aes-256-gcm', process.env.ENCRYPTION_KEY);
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

---

## 6. Scalability Architecture

### 6.1 Horizontal Scaling Strategy

```yaml
# Kubernetes Auto-scaling Configuration
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
  maxReplicas: 50
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
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"

---
# Vertical Pod Autoscaler
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: feedback-platform-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: feedback-platform-api
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: api
      maxAllowed:
        cpu: 2
        memory: 4Gi
      minAllowed:
        cpu: 100m
        memory: 128Mi
```

### 6.2 Database Scaling

```javascript
// Database scaling architecture
const DatabaseScaling = {
  readReplicas: {
    count: "2-5 read replicas",
    loadBalancing: "Round-robin for read queries",
    replicationLag: "< 100ms acceptable lag",
    failover: "Automatic promotion on master failure"
  },
  
  sharding: {
    strategy: "Shard by tenant_id for future scaling",
    implementation: "Application-level sharding",
    resharding: "Automated shard rebalancing"
  },
  
  connectionPooling: {
    pooler: "PgBouncer",
    maxConnections: "100 per pool",
    pooling: "Transaction-level pooling"
  }
};

// Database connection manager
class DatabaseManager {
  constructor() {
    this.masterPool = new Pool({ ...masterConfig, max: 20 });
    this.replicaPools = replicas.map(config => 
      new Pool({ ...config, max: 20 })
    );
  }
  
  async query(sql, params, options = {}) {
    const isReadQuery = sql.trim().toLowerCase().startsWith('select');
    const pool = (isReadQuery && !options.forceMaster) 
      ? this.getReadPool() 
      : this.masterPool;
    
    return await pool.query(sql, params);
  }
  
  getReadPool() {
    // Simple round-robin load balancing
    const index = Math.floor(Math.random() * this.replicaPools.length);
    return this.replicaPools[index];
  }
}
```

### 6.3 Caching Scaling

```javascript
// Redis Cluster Configuration
const RedisClusterConfig = {
  topology: {
    nodes: 6, // 3 masters, 3 slaves
    replication: "Master-slave replication",
    sharding: "Automatic key distribution"
  },
  
  scaling: {
    horizontal: "Add nodes to cluster",
    resharding: "Automatic slot rebalancing",
    failover: "Automatic master election"
  },
  
  performance: {
    memory: "8GB per node",
    persistence: "RDB + AOF for durability",
    eviction: "allkeys-lru policy"
  }
};

// Cache client with cluster support
class CacheCluster {
  constructor() {
    this.cluster = new Redis.Cluster([
      { host: 'redis-1', port: 6379 },
      { host: 'redis-2', port: 6379 },
      { host: 'redis-3', port: 6379 }
    ], {
      redisOptions: {
        password: process.env.REDIS_PASSWORD
      },
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
  }
  
  async get(key) {
    return await this.cluster.get(key);
  }
  
  async setWithTTL(key, value, ttl) {
    return await this.cluster.setex(key, ttl, value);
  }
  
  async invalidatePattern(pattern) {
    const stream = this.cluster.scanStream({
      match: pattern,
      count: 100
    });
    
    const pipeline = this.cluster.pipeline();
    stream.on('data', (keys) => {
      keys.forEach(key => pipeline.del(key));
    });
    
    stream.on('end', () => {
      pipeline.exec();
    });
  }
}
```

---

## 7. Monitoring & Observability

### 7.1 Application Monitoring

```javascript
// Prometheus metrics collection
const prometheus = require('prom-client');

// Custom business metrics
const feedbackSubmissions = new prometheus.Counter({
  name: 'feedback_submissions_total',
  help: 'Total number of feedback submissions',
  labelNames: ['tenant_id', 'industry', 'rating']
});

const responseTime = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code', 'tenant_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const activeUsers = new prometheus.Gauge({
  name: 'active_users_current',
  help: 'Current number of active users',
  labelNames: ['tenant_id']
});

// Metrics middleware
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    responseTime
      .labels(req.method, req.route?.path || 'unknown', res.statusCode, req.user?.tenant_id || 'anonymous')
      .observe(duration);
  });
  
  next();
};
```

### 7.2 Distributed Tracing

```javascript
// OpenTelemetry tracing setup
const { NodeTracerProvider } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'feedback-platform',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
  }),
});

// Trace feedback submission flow
class TracingService {
  static async traceFeedbackSubmission(req, res, next) {
    const tracer = opentelemetry.trace.getTracer('feedback-service');
    
    const span = tracer.startSpan('feedback_submission', {
      attributes: {
        'tenant.id': req.user?.tenant_id,
        'feedback.rating': req.body.overall_rating,
        'user.id': req.user?.user_id
      }
    });
    
    try {
      res.locals.span = span;
      await next();
      span.setStatus({ code: opentelemetry.SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({ 
        code: opentelemetry.SpanStatusCode.ERROR, 
        message: error.message 
      });
      throw error;
    } finally {
      span.end();
    }
  }
}
```

### 7.3 Health Checks

```javascript
// Comprehensive health check system
class HealthCheckService {
  static async performHealthCheck() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkBackblaze(),
      this.checkExternalAPIs(),
      this.checkDiskSpace(),
      this.checkMemoryUsage()
    ]);
    
    const results = checks.map((check, index) => ({
      name: this.checkNames[index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      details: check.status === 'fulfilled' ? check.value : check.reason.message,
      timestamp: new Date().toISOString()
    }));
    
    const overallHealth = results.every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy';
    
    return {
      status: overallHealth,
      checks: results,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
  
  static checkNames = [
    'database', 'redis', 'backblaze', 'external_apis', 'disk_space', 'memory'
  ];
  
  static async checkDatabase() {
    const start = Date.now();
    await db.query('SELECT 1');
    return { responseTime: Date.now() - start };
  }
  
  static async checkRedis() {
    const start = Date.now();
    await redis.ping();
    return { responseTime: Date.now() - start };
  }
  
  static async checkBackblaze() {
    // Check B2 API connectivity
    const start = Date.now();
    await b2.listBuckets();
    return { responseTime: Date.now() - start };
  }
}
```

---

## 8. Disaster Recovery & Backup

### 8.1 Backup Strategy

```javascript
// Automated backup system
const BackupStrategy = {
  database: {
    frequency: "Every 6 hours",
    retention: "30 days hot, 1 year cold storage",
    method: "pg_dump with compression",
    encryption: "AES-256 encryption",
    verification: "Daily restore tests"
  },
  
  files: {
    frequency: "Real-time (B2 versioning)",
    retention: "90 days versions",
    crossRegion: "Automatic cross-region replication",
    verification: "Weekly integrity checks"
  },
  
  configuration: {
    frequency: "On change + daily",
    storage: "Git repository + encrypted backups",
    retention: "Indefinite version history"
  }
};

class BackupService {
  static async performDatabaseBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `db-backup-${timestamp}.sql.gz`;
    
    // Create database dump
    const dumpCommand = `pg_dump ${process.env.DATABASE_URL} | gzip > /tmp/${filename}`;
    await execAsync(dumpCommand);
    
    // Encrypt backup
    const encryptedFile = await this.encryptFile(`/tmp/${filename}`);
    
    // Upload to B2
    const uploadResult = await b2Service.uploadFile(
      encryptedFile, 
      'system', 
      'backups'
    );
    
    // Store backup metadata
    await db.query(`
      INSERT INTO backup_logs (backup_type, filename, size, checksum, created_at)
      VALUES ('database', $1, $2, $3, CURRENT_TIMESTAMP)
    `, [filename, uploadResult.size, uploadResult.checksum]);
    
    // Cleanup local files
    await fs.unlink(`/tmp/${filename}`);
    await fs.unlink(encryptedFile);
    
    return uploadResult;
  }
  
  static async verifyBackup(backupId) {
    // Download backup
    const backup = await this.downloadBackup(backupId);
    
    // Decrypt
    const decrypted = await this.decryptFile(backup);
    
    // Test restore to temporary database
    const testDb = await this.createTemporaryDatabase();
    const restoreResult = await this.restoreDatabase(testDb, decrypted);
    
    // Verify data integrity
    const integrityCheck = await this.verifyDataIntegrity(testDb);
    
    // Cleanup
    await this.dropTemporaryDatabase(testDb);
    
    return {
      backupId,
      verified: restoreResult.success && integrityCheck.passed,
      details: { restoreResult, integrityCheck }
    };
  }
}
```

### 8.2 Disaster Recovery Plan

```javascript
// Disaster Recovery Architecture
const DisasterRecoveryPlan = {
  rto: "4 hours", // Recovery Time Objective
  rpo: "15 minutes", // Recovery Point Objective
  
  scenarios: {
    singleNodeFailure: {
      detection: "Health checks + monitoring alerts",
      response: "Automatic failover to healthy nodes",
      timeline: "< 5 minutes"
    },
    
    databaseFailure: {
      detection: "Connection failures + replication lag",
      response: "Promote read replica to master",
      timeline: "< 30 minutes"
    },
    
    regionalOutage: {
      detection: "Multi-service failures",
      response: "Failover to backup region",
      timeline: "< 4 hours"
    },
    
    dataCorruption: {
      detection: "Data integrity checks",
      response: "Restore from point-in-time backup",
      timeline: "< 8 hours"
    }
  },
  
  automation: {
    monitoring: "24/7 automated monitoring",
    alerting: "Immediate alert escalation",
    failover: "Automated for single points of failure",
    communication: "Automated customer notifications"
  }
};
```

This comprehensive System Architecture Document provides your development team with detailed technical specifications for implementing a robust, scalable multi-industry feedback management platform with proper Backblaze B2 integration and enterprise-grade architecture patterns.