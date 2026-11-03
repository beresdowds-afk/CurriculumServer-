# Cloud Run vs Static CDN Hosting Architecture — Curriculum Server & Curriculum Flow

## Executive Summary
This document evaluates the architectural trade-offs between serving the decoupled Curriculum Server (`curriculumserver.com.ng`) and Curriculum Flow (`curriculumflow.com.ng`) frontends via:
1. **Google Cloud Storage (GCS) + Global HTTP(S) Load Balancer + Cloud CDN**.
2. **Google Cloud Run (Lightweight Node/Express static container)**.

---

## 1. Architectural Comparison Matrix

| Evaluation Criterion | GCS + Cloud CDN + LB | Cloud Run (Express Static Container) | Selected / Recommended Strategy |
|----------------------|-----------------------|--------------------------------------|--------------------------------|
| **Cold Start Latency** | Instant (Edge cached) | ~200-500ms container cold start | **Cloud Run** (with `minScale: 1` eliminates cold starts) |
| **SPA Routing (HTML5 History)** | Requires custom error page XML redirects (`/index.html` on 404) | Handled natively by Express `app.get('*', ...)` | **Cloud Run** (Zero redirect configuration overhead) |
| **Health Checks (`/healthz`)** | Built-in via Load Balancer backend config | Native HTTP liveness & startup probes | **Cloud Run** |
| **TLS & Custom Domains** | Managed via Google Certificate Manager | Managed via Cloud Run domain mappings | **Cloud Run** |
| **Cost at Scale** | Extremely low for static storage | Per-request CPU/Memory active compute time | **Cloud Run** (Offset by aggressive browser caching and `minScale: 1`) |
| **API Proxy & Header Injection** | Requires Cloud Armor / Serverless Network Endpoint Groups | Can seamlessly inject proxy headers, CSP, and security middleware | **Cloud Run** |

---

## 2. Recommendation & Implementation Decision

We recommend and implement **Google Cloud Run** for both frontends because:
1. **Seamless SPA Routing**: Single-page application deep linking (e.g. `curriculumflow.com.ng/timetable/term-1`) requires fallback to `index.html`. Cloud Run with an Express static server handles this instantly without complex bucket custom error XML mappings.
2. **Robust Health Checking & Observability**: Cloud Run provides out-of-the-box container health probes (`/healthz`), request latency percentiles, and automatic revision rollbacks.
3. **Security Header Control**: The Express wrapper allows setting strict Content Security Policies (CSP), HSTS, X-Frame-Options, and CORS headers at the response layer.
4. **Zero Cold Starts**: Setting `minScale: 1` ensures a warm container is always running, guaranteeing sub-50ms TTFB (Time to First Byte) for Nigerian educational institutions.
