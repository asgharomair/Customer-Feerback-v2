# API Documentation & Specifications
## Multi-Industry Feedback Management SaaS Platform

### Document Information
- **Version:** 1.0
- **Date:** August 2025
- **API Version:** v1
- **Base URL:** `https://api.feedbackplatform.com/v1`

---

## 1. API Overview

### 1.1 Authentication
All API requests require authentication via JWT Bearer tokens.

```http
Authorization: Bearer <jwt_token>
```

### 1.2 Request/Response Format
- **Content-Type:** `application/json`
- **Character Encoding:** UTF-8
- **Date Format:** ISO 8601 (e.g., `2025-08-03T10:30:00Z`)

### 1.3 Rate Limiting
- **Default:** 1000 requests/hour per tenant
- **Burst:** 100 requests/minute
- **Headers:**
  - `X-RateLimit-Limit`: Request limit per window
  - `X-RateLimit-Remaining`: Requests remaining in window
  - `X-RateLimit-Reset`: Window reset time (Unix timestamp)

### 1.4 Error Handling
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required",
        "code": "REQUIRED"
      }
    ]
  },
  "timestamp": "2025-08-03T10:30:00Z",
  "request_id": "req_123456789"
}
```

---

## 2. Authentication Endpoints

### 2.1 User Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@company.com",
  "password": "securePassword123",
  "remember_me": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900,
    "token_type": "Bearer",
    "user": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@company.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "admin",
      "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
      "permissions": ["read:feedback", "write:surveys", "manage:users"]
    }
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 2.2 Refresh Token
```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900,
    "token_type": "Bearer"
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 2.3 User Registration
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "newuser@company.com",
  "password": "securePassword123",
  "first_name": "Jane",
  "last_name": "Smith",
  "company_name": "Acme Corporation",
  "industry_type": "restaurant",
  "phone_number": "+1234567890"
}
```

### 2.4 Logout
```http
POST /auth/logout
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## 3. Tenant Management

### 3.1 Get Tenant Profile
```http
GET /tenants/profile
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
    "company_name": "Acme Restaurant Group",
    "industry_type": "restaurant",
    "subscription_plan": "professional",
    "created_at": "2025-01-15T08:00:00Z",
    "is_active": true,
    "contact_details": {
      "phone": "+1234567890",
      "address": "123 Main St, City, State 12345",
      "website": "https://acmerestaurants.com"
    },
    "timezone": "America/New_York",
    "settings": {
      "default_language": "en",
      "date_format": "MM/DD/YYYY",
      "currency": "USD"
    }
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 3.2 Update Tenant Profile
```http
PUT /tenants/profile
```

**Request Body:**
```json
{
  "company_name": "Acme Restaurant Group Updated",
  "contact_details": {
    "phone": "+1234567891",
    "address": "456 New St, City, State 12345",
    "website": "https://newacmerestaurants.com"
  },
  "timezone": "America/Los_Angeles"
}
```

---

## 4. Survey Management

### 4.1 Get Survey Templates
```http
GET /surveys/templates?industry=restaurant&page=1&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "template_id": "550e8400-e29b-41d4-a716-446655440002",
        "template_name": "Restaurant Feedback Template",
        "industry_type": "restaurant",
        "is_default": true,
        "is_active": true,
        "created_at": "2025-01-15T08:00:00Z",
        "template_structure": {
          "sections": [
            {
              "section_id": "basic_info",
              "title": "Basic Information",
              "fields": [
                {
                  "field_id": "customer_name",
                  "field_name": "Customer Name",
                  "field_type": "text",
                  "is_required": true,
                  "display_order": 1
                },
                {
                  "field_id": "table_number",
                  "field_name": "Table Number",
                  "field_type": "text",
                  "is_required": false,
                  "display_order": 2
                }
              ]
            },
            {
              "section_id": "feedback",
              "title": "Feedback",
              "fields": [
                {
                  "field_id": "overall_rating",
                  "field_name": "Overall Rating",
                  "field_type": "rating",
                  "is_required": true,
                  "display_order": 1,
                  "validation_rules": {
                    "min": 1,
                    "max": 5
                  }
                }
              ]
            }
          ]
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1
    }
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 4.2 Create Survey Template
```http
POST /surveys/templates
```

**Request Body:**
```json
{
  "template_name": "Custom Restaurant Template",
  "industry_type": "restaurant",
  "template_structure": {
    "sections": [
      {
        "section_id": "basic_info",
        "title": "Customer Information",
        "fields": [
          {
            "field_name": "Customer Name",
            "field_type": "text",
            "is_required": true,
            "display_order": 1
          },
          {
            "field_name": "Phone Number",
            "field_type": "phone",
            "is_required": false,
            "display_order": 2
          }
        ]
      }
    ]
  }
}
```

### 4.3 Get Custom Fields
```http
GET /surveys/custom-fields
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "custom_fields": [
      {
        "field_definition_id": "550e8400-e29b-41d4-a716-446655440003",
        "field_name": "Dietary Preferences",
        "field_type": "dropdown",
        "field_options": {
          "options": [
            {"value": "vegetarian", "label": "Vegetarian"},
            {"value": "vegan", "label": "Vegan"},
            {"value": "gluten_free", "label": "Gluten Free"},
            {"value": "none", "label": "No Restrictions"}
          ]
        },
        "is_required": false,
        "display_order": 5,
        "is_active": true,
        "created_at": "2025-02-01T10:00:00Z"
      }
    ]
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 4.4 Create Custom Field
```http
POST /surveys/custom-fields
```

**Request Body:**
```json
{
  "field_name": "Special Requests",
  "field_type": "textarea",
  "is_required": false,
  "display_order": 10,
  "validation_rules": {
    "max_length": 500
  }
}
```

---

## 5. QR Code Management

### 5.1 Get QR Codes
```http
GET /qr-codes?location_id=550e8400-e29b-41d4-a716-446655440004&page=1&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "qr_codes": [
      {
        "qr_code_id": "550e8400-e29b-41d4-a716-446655440005",
        "location_id": "550e8400-e29b-41d4-a716-446655440004",
        "qr_code_data": "https://app.feedbackplatform.com/feedback/550e8400-e29b-41d4-a716-446655440005",
        "table_number": "T001",
        "encoded_url": "https://api.qrserver.com/v1/create-qr-code/?data=...",
        "is_active": true,
        "created_at": "2025-02-01T08:00:00Z",
        "last_scanned": "2025-08-03T09:30:00Z",
        "scan_count": 47
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "total_pages": 2
    }
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 5.2 Create QR Code
```http
POST /qr-codes
```

**Request Body:**
```json
{
  "location_id": "550e8400-e29b-41d4-a716-446655440004",
  "table_number": "T025",
  "bed_number": null,
  "custom_data": {
    "section": "Patio",
    "server_name": "John"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "qr_code_id": "550e8400-e29b-41d4-a716-446655440006",
    "qr_code_data": "https://app.feedbackplatform.com/feedback/550e8400-e29b-41d4-a716-446655440006",
    "encoded_url": "https://api.qrserver.com/v1/create-qr-code/?data=...",
    "printable_url": "https://cdn.feedbackplatform.com/qr-codes/550e8400-e29b-41d4-a716-446655440006.pdf"
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 5.3 Get QR Code Analytics
```http
GET /qr-codes/550e8400-e29b-41d4-a716-446655440005/analytics?period=30d
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "qr_code_id": "550e8400-e29b-41d4-a716-446655440005",
    "period": "30d",
    "analytics": {
      "total_scans": 47,
      "unique_scans": 42,
      "completed_feedback": 38,
      "completion_rate": 80.85,
      "average_rating": 4.2,
      "daily_scans": [
        {"date": "2025-07-04", "scans": 2, "completions": 2},
        {"date": "2025-07-05", "scans": 3, "completions": 2}
      ]
    }
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

---

## 6. Feedback Collection

### 6.1 Get Feedback Form (Public)
```http
GET /feedback/form/550e8400-e29b-41d4-a716-446655440005
```
*Note: This endpoint doesn't require authentication*

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "qr_code_id": "550e8400-e29b-41d4-a716-446655440005",
    "company_name": "Acme Restaurant",
    "location_name": "Downtown Branch",
    "table_number": "T001",
    "form_structure": {
      "sections": [
        {
          "section_id": "basic_info",
          "title": "Your Information",
          "fields": [
            {
              "field_id": "customer_name",
              "field_name": "Name",
              "field_type": "text",
              "is_required": true,
              "placeholder": "Enter your name"
            }
          ]
        }
      ]
    },
    "branding": {
      "logo_url": "https://cdn.feedbackplatform.com/logos/tenant_123.png",
      "primary_color": "#1976d2",
      "secondary_color": "#424242"
    }
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 6.2 Submit Feedback (Public)
```http
POST /feedback/submit
```
*Note: This endpoint doesn't require authentication*

**Request Body:**
```json
{
  "qr_code_id": "550e8400-e29b-41d4-a716-446655440005",
  "customer_name": "John Customer",
  "customer_email": "john@customer.com",
  "customer_phone": "+1234567890",
  "overall_rating": 5,
  "feedback_text": "Excellent service and food quality!",
  "custom_fields": {
    "550e8400-e29b-41d4-a716-446655440003": "vegetarian",
    "special_requests": "Table by the window was perfect"
  },
  "voice_file_id": "550e8400-e29b-41d4-a716-446655440007",
  "image_file_id": "550e8400-e29b-41d4-a716-446655440008"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "response_id": "550e8400-e29b-41d4-a716-446655440009",
    "submitted_at": "2025-08-03T10:30:00Z",
    "confirmation_code": "FB-2025-001234"
  },
  "message": "Thank you for your feedback!",
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 6.3 Get Feedback Responses
```http
GET /feedback/responses?page=1&limit=20&rating_min=1&rating_max=5&date_from=2025-07-01&date_to=2025-08-03&location_id=550e8400-e29b-41d4-a716-446655440004
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "responses": [
      {
        "response_id": "550e8400-e29b-41d4-a716-446655440009",
        "location_id": "550e8400-e29b-41d4-a716-446655440004",
        "qr_code_id": "550e8400-e29b-41d4-a716-446655440005",
        "customer_name": "John Customer",
        "customer_email": "john@customer.com",
        "overall_rating": 5,
        "feedback_text": "Excellent service and food quality!",
        "submitted_at": "2025-08-03T10:30:00Z",
        "status": "new",
        "custom_fields": [
          {
            "field_name": "Dietary Preferences",
            "field_value": "vegetarian"
          }
        ],
        "multimedia_files": [
          {
            "file_id": "550e8400-e29b-41d4-a716-446655440007",
            "file_type": "voice",
            "file_url": "https://cdn.feedbackplatform.com/voice/signed_url_here"
          }
        ],
        "location_data": {
          "table_number": "T001",
          "location_name": "Downtown Branch"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "total_pages": 8
    }
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

---

## 7. File Management (Backblaze Integration)

### 7.1 Upload File
```http
POST /files/upload
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
```
file: [binary file data]
file_type: "voice" | "image"
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "file_id": "550e8400-e29b-41d4-a716-446655440010",
    "file_name": "voice_recording_20250803.mp3",
    "file_type": "voice",
    "file_size": 2048576,
    "mime_type": "audio/mpeg",
    "uploaded_at": "2025-08-03T10:30:00Z",
    "backblaze_file_id": "4_z27c88f1d182b150646ff0b16_f200ec4a7a9d6be_d20220330_m130258_c001_v0001017_t0006",
    "cdn_url": "https://cdn.feedbackplatform.com/files/550e8400-e29b-41d4-a716-446655440010",
    "expires_at": "2025-08-03T11:30:00Z"
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 7.2 Get File Download URL
```http
GET /files/550e8400-e29b-41d4-a716-446655440010/download-url?expires_in=3600
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "download_url": "https://cdn.feedbackplatform.com/files/signed_url_with_auth_token",
    "expires_at": "2025-08-03T11:30:00Z"
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

---

## 8. Analytics & Reporting

### 8.1 Get Dashboard Analytics
```http
GET /analytics/dashboard?period=30d&location_id=550e8400-e29b-41d4-a716-446655440004
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "location_id": "550e8400-e29b-41d4-a716-446655440004",
    "metrics": {
      "total_responses": 156,
      "average_rating": 4.2,
      "response_rate": 82.5,
      "nps_score": 45,
      "response_distribution": {
        "1": 5,
        "2": 8,
        "3": 15,
        "4": 67,
        "5": 61
      },
      "trends": {
        "daily_responses": [
          {"date": "2025-07-04", "count": 5, "avg_rating": 4.2},
          {"date": "2025-07-05", "count": 7, "avg_rating": 4.1}
        ]
      },
      "sentiment_analysis": {
        "positive": 78.2,
        "neutral": 15.4,
        "negative": 6.4
      }
    }
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 8.2 Generate Report
```http
POST /reports/generate
```

**Request Body:**
```json
{
  "report_type": "feedback_summary",
  "format": "pdf",
  "date_range": {
    "start_date": "2025-07-01",
    "end_date": "2025-08-03"
  },
  "filters": {
    "location_ids": ["550e8400-e29b-41d4-a716-446655440004"],
    "rating_min": 1,
    "rating_max": 5
  },
  "include_charts": true,
  "include_raw_data": false
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "report_id": "550e8400-e29b-41d4-a716-446655440011",
    "status": "processing",
    "estimated_completion": "2025-08-03T10:35:00Z"
  },
  "message": "Report generation started. You will be notified when it's ready.",
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 8.3 Get Report Status
```http
GET /reports/550e8400-e29b-41d4-a716-446655440011
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "report_id": "550e8400-e29b-41d4-a716-446655440011",
    "report_type": "feedback_summary",
    "status": "completed",
    "file_format": "pdf",
    "generated_at": "2025-08-03T10:34:00Z",
    "expires_at": "2025-08-10T10:34:00Z",
    "download_url": "https://cdn.feedbackplatform.com/reports/signed_url_here",
    "file_size": 1048576
  },
  "timestamp": "2025-08-03T10:35:00Z"
}
```

---

## 9. Alerts & Notifications

### 9.1 Get Alert Rules
```http
GET /alerts/rules
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "alert_rules": [
      {
        "alert_id": "550e8400-e29b-41d4-a716-446655440012",
        "alert_name": "Low Rating Alert",
        "trigger_conditions": {
          "rating_threshold": 2,
          "condition": "less_than_or_equal",
          "time_window": "immediate"
        },
        "notification_channels": ["email", "sms"],
        "recipient_list": [
          {
            "type": "email",
            "address": "manager@acmerestaurant.com"
          },
          {
            "type": "sms",
            "number": "+1234567890"
          }
        ],
        "is_active": true,
        "created_at": "2025-01-15T08:00:00Z"
      }
    ]
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 9.2 Create Alert Rule
```http
POST /alerts/rules
```

**Request Body:**
```json
{
  "alert_name": "High Volume Alert",
  "trigger_conditions": {
    "feedback_count": 50,
    "condition": "greater_than",
    "time_window": "1h"
  },
  "notification_channels": ["email"],
  "recipient_list": [
    {
      "type": "email",
      "address": "operations@acmerestaurant.com"
    }
  ],
  "message_template": "High feedback volume detected: {{feedback_count}} responses in the last hour."
}
```

---

## 10. Public Review Integration

### 10.1 Get Integrated Reviews
```http
GET /reviews/integrated?platform=google&page=1&limit=20&date_from=2025-07-01
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "review_id": "550e8400-e29b-41d4-a716-446655440013",
        "platform_name": "google",
        "external_review_id": "ChZDSUhNMG9nS0VJQ0FnSUM3X3J",
        "reviewer_name": "Sarah Johnson",
        "rating": 5,
        "review_text": "Amazing food and excellent service! Highly recommend.",
        "review_date": "2025-07-15T14:30:00Z",
        "imported_at": "2025-07-16T02:00:00Z",
        "platform_data": {
          "author_url": "https://www.google.com/maps/contrib/...",
          "relative_time_description": "2 weeks ago"
        },
        "status": "published"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  },
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 10.2 Configure Platform Integration
```http
POST /integrations/configure
```

**Request Body:**
```json
{
  "platform_name": "google",
  "configuration": {
    "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "api_key": "encrypted_api_key_here",
    "sync_frequency": "daily",
    "import_historical": true,
    "historical_days": 90
  },
  "is_active": true
}
```

---

## 11. Webhook Endpoints

### 11.1 Configure Webhooks
```http
POST /webhooks/configure
```

**Request Body:**
```json
{
  "webhook_url": "https://your-app.com/webhooks/feedback",
  "events": ["feedback.submitted", "feedback.rating_low", "report.generated"],
  "secret": "your_webhook_secret",
  "is_active": true
}
```

### 11.2 Webhook Payload Example
When a new feedback is submitted, your webhook endpoint will receive:

```json
{
  "event": "feedback.submitted",
  "timestamp": "2025-08-03T10:30:00Z",
  "data": {
    "response_id": "550e8400-e29b-41d4-a716-446655440009",
    "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
    "location_id": "550e8400-e29b-41d4-a716-446655440004",
    "customer_name": "John Customer",
    "overall_rating": 5,
    "submitted_at": "2025-08-03T10:30:00Z"
  },
  "signature": "sha256=calculated_hmac_signature"
}
```

---

## 12. Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `TENANT_NOT_FOUND` | 404 | Tenant does not exist |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `FILE_TOO_LARGE` | 413 | Uploaded file exceeds size limit |
| `UNSUPPORTED_FILE_TYPE` | 415 | File type not supported |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## 13. SDK Examples

### 13.1 JavaScript/Node.js SDK Example
```javascript
const FeedbackPlatformAPI = require('@feedbackplatform/api-client');

const client = new FeedbackPlatformAPI({
  apiKey: 'your_api_key_here',
  baseURL: 'https://api.feedbackplatform.com/v1'
});

// Submit feedback
const response = await client.feedback.submit({
  qr_code_id: 'qr_code_uuid',
  customer_name: 'John Doe',
  overall_rating: 5,
  feedback_text: 'Great service!'
});

// Get analytics
const analytics = await client.analytics.getDashboard({
  period: '30d',
  location_id: 'location_uuid'
});
```

### 13.2 Python SDK Example
```python
from feedbackplatform import FeedbackPlatformClient

client = FeedbackPlatformClient(
    api_key='your_api_key_here',
    base_url='https://api.feedbackplatform.com/v1'
)

# Submit feedback
response = client.feedback.submit({
    'qr_code_id': 'qr_code_uuid',
    'customer_name': 'John Doe',
    'overall_rating': 5,
    'feedback_text': 'Great service!'
})

# Get analytics
analytics = client.analytics.get_dashboard(
    period='30d',
    location_id='location_uuid'
)
```

This comprehensive API documentation provides your development team with detailed specifications for implementing all API endpoints, including authentication, data models, error handling, and integration examples.