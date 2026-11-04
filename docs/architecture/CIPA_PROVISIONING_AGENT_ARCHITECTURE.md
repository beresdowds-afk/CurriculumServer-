# Curriculum Infrastructure Provisioning Agent (CIPA) — Architecture Specification

## 1. Executive Overview
The **Curriculum Infrastructure Provisioning Agent (CIPA)** is the autonomous infrastructure coordination agent responsible for parsing natural-language school provisioning requests, evaluating infrastructure requirements through the Intelligent Instance Architecture & Provisioning Engine (IIAPE), enforcing human authorisation via the Privileged Infrastructure Authorisation Manager (PIAM), and orchestrating deployment through the provisioning control plane.

## 2. Core Functional Capabilities
- **Natural-Language Requirement Extraction**: Parses unstructured text prompts to extract school name, student population, staff count, region, required applications, storage, database, and domain specifications.
- **Request Classification**: Classifies workloads into 7 standardized topologies (Full School Management Instance, Custom Architecture, Feature Collection, Shared Infrastructure, Dedicated Cloud Run, Dedicated GCP Project, Hybrid).
- **IIAPE Integration**: Evaluates concurrency, workload, and security constraints to generate cost estimates and architecture trade-offs.
- **Instance Architecture Profiles**: Maintains versioned authoritative deployment records.
- **Provisioning Plan Generation**: Generates 19-step ordered execution plans.
- **PIAM Integration**: Submits requests for privileged operations (GCP project creation, billing association) requiring verified human approver separation and audit logging.
- **Provisioning Orchestrator Integration**: Coordinates Project Factory, Infrastructure Deployer, and Domain Manager identities (`curriculum-provisioning-agent-runtime`).

## 3. Cloud Run Deployment Specification (`curriculum-provisioning-agent`)
- **Service Name**: `curriculum-provisioning-agent`
- **Region**: `europe-west1`
- **Runtime Identity**: `curriculum-provisioning-agent-runtime`
- **Endpoints**:
  - `GET /health`, `GET /ready`
  - `POST /api/v1/agent/requests`
  - `GET /api/v1/agent/requests/{requestId}`
  - `POST /api/v1/agent/requests/{requestId}/evaluate`
  - `POST /api/v1/agent/requests/{requestId}/plan`
  - `POST /api/v1/agent/requests/{requestId}/submit`
  - `POST /api/v1/agent/requests/{requestId}/piam-approval`
  - `POST /api/v1/agent/requests/{requestId}/cancel`
