# External Deployment Specifications

## 1. Central Services Overview
The Curriculum Server ecosystem is partitioned into three central Cloud Run services designed to run behind a global external Application Load Balancer:
1. `curriculum-server` (Control Plane Frontend)
2. `curriculum-flow` (Education Application Frontend)
3. `curriculum-backend` (Unified Express API Service)

## 2. Service Runtime Requirements & Configuration

### A. `curriculum-backend`
- **Build Artifact**: Docker container or ESBuild/Vite Node bundle (`dist/server.cjs`).
- **Target Port**: `3000` (or `PORT` environment variable).
- **Required Environment Variables**:
  - `PORT=3000`
  - `NODE_ENV=production`
  - `DATABASE_URL=postgres://cs_app_user:SECURE_PASSWORD@localhost:5432/curriculum_platform`
  - `GEMINI_API_KEY=<managed-via-secret-manager>`
- **Health Check Endpoint**: `GET /api/v1/health`

### B. `curriculum-server` & `curriculum-flow`
- **Build Artifact**: Static Vite production bundle (`dist/`).
- **Runtime**: Served via Nginx or Cloud Run static serving / Express SPA routing.
- **Environment Variables**:
  - `VITE_API_BASE_URL=https://curriculumserver.com.ng/api/v1`

## 3. Google Cloud Boundary Note
These services are prepared for external deployment. In accordance with AI Studio security boundaries, no live Cloud Run services or infrastructure resources are executed or modified within this environment.
