# CI/CD Workload Identity Federation Architecture

## 1. Security Principle: Keyless Authentication
To eliminate the security risks associated with permanent service account JSON keys stored in GitHub repository secrets, the Curriculum Server platform is architected for **GitHub Actions Workload Identity Federation**.

## 2. Federation Architecture
- **Provider**: Google Cloud Workload Identity Pool and Provider configured for GitHub Actions (`repo:organization/curriculum-server:*`).
- **Pipeline Trust**: GitHub Actions workflow requests a short-lived OIDC token directly from GitHub's OpenID Connect provider and exchanges it for a GCP Access Token via Google Cloud Security Token Service.
- **Service Account Impersonation**: The CI/CD runner impersonates `curriculum-ci-deployer` exclusively during the execution of the GitHub Actions workflow.

## 3. Pipeline Stages
1. **Lint & Type Check**: `npm run lint` (`tsc --noEmit`).
2. **Automated Unit & Integration Tests**: Test suite verification.
3. **Multi-App Build**: `npm run build:all` (compiling server, server frontend, and flow frontend).
4. **Deploy to Cloud Run**: Authenticated via Workload Identity Federation (external execution).
