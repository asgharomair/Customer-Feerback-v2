# Overview

This is a multi-industry feedback management SaaS platform that enables businesses to collect customer feedback through QR codes and manage it via a comprehensive dashboard. The application serves multiple business customers across various industries including restaurants, healthcare, retail, and hospitality. Key features include QR code-based feedback collection, real-time analytics, customizable survey templates, multimedia feedback support (voice and images), and automated alert systems for critical feedback.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with tab-based navigation
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Form Handling**: React Hook Form with Zod for validation

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM with PostgreSQL as the database
- **Real-time Features**: WebSocket server for live notifications and alerts
- **File Upload**: Uppy with direct-to-cloud storage integration
- **Multi-tenancy**: Database-level tenant isolation with shared schema

## Database Design
- **Multi-tenant Architecture**: Tenant-based data isolation with shared database schema
- **Core Entities**: Tenants, Users, Locations, Survey Templates, QR Codes, Feedback Responses, Alert Rules, and Analytics
- **Session Management**: Database-stored sessions for authentication
- **Schema Management**: Drizzle migrations with PostgreSQL dialect

## Real-time System
- **WebSocket Integration**: Live notifications for critical feedback alerts
- **Client-side Connection**: Automatic reconnection with tenant-based message routing
- **Alert Broadcasting**: Targeted notifications to specific tenant users

## Authentication & Authorization
- **Session-based Authentication**: Server-side session management
- **Multi-tenant Access Control**: Tenant-scoped data access and user permissions
- **Role-based Permissions**: Admin and user roles with different access levels

## File Management
- **Object Storage**: Google Cloud Storage integration with ACL-based access control
- **Upload Handling**: Direct-to-cloud uploads with progress tracking
- **Media Support**: Voice recordings and image attachments for feedback

# External Dependencies

## Database & Storage
- **Neon Database**: PostgreSQL serverless database hosting
- **Google Cloud Storage**: Object storage for multimedia files and assets
- **Drizzle Kit**: Database migration and schema management tools

## Communication Services
- **SendGrid**: Email service for notifications and alerts
- **WebSocket Protocol**: Native WebSocket for real-time features

## Development & Deployment
- **Replit Infrastructure**: Hosting platform with sidecar authentication
- **Vite Development Server**: Hot module replacement and development tooling
- **TypeScript**: Type safety across the full stack

## Frontend Libraries
- **Radix UI**: Headless UI components for accessibility
- **Recharts**: Data visualization for analytics dashboard
- **QRCode Library**: QR code generation for feedback links
- **Uppy**: File upload handling with progress tracking

## Validation & Utilities
- **Zod**: Runtime type validation and schema definition
- **Class Variance Authority**: CSS class management utilities
- **React Beautiful DnD**: Drag and drop for survey builder interface