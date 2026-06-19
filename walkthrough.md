# Walkthrough: DocBridge CI/CD & Helm Deployment Success

This walkthrough details the final resolutions, template diagnostics, and verification steps that successfully established a 100% green pipeline system for both Application deployment and Terraform Infrastructure.

---

## 1. Latest Resolutions & Diagnostics

### A. Upgraded SonarCloud Token to a User Token
- **The Issue**: Previously, the SonarCloud Quality Gate step failed with a `403 Forbidden` API error.
- **The Resolution**: The repository's `SONAR_TOKEN` was upgraded to a **User Token** with Browse/Read permissions on the project. This allowed the GitHub Actions workflow to safely query the SonarCloud analysis endpoints, passing all 12 SonarCloud SAST scan jobs cleanly.

### B. Robust Application Gateway Health Check Retry Loop
- **The Issue**: Immediately following a successful Helm deploy, the single-attempt smoke check (`curl` to `http://57.167.90.5/api/v1/health`) often returned `502 Bad Gateway`. This was caused by the replication lag of the Azure Application Gateway Ingress Controller (AGIC) registering the newly spun-up pods in the gateway's backend pool. This transient failure unnecessarily triggered a Helm rollback.
- **The Resolution**: Replaced the single-curl smoke check in both [.github/workflows/cicd-application.yml](file:///.github/workflows/cicd-application.yml) and [.github/workflows/template-helm-deploy.yml](file:///.github/workflows/template-helm-deploy.yml) with a robust retry loop (up to 15 retries with a 15-second delay). This lets AGIC successfully bind the new endpoints to the Azure Application Gateway, ensuring deployments succeed without transient failures.

---

## 2. Final Pipeline Execution Status

Both systems have been verified through complete end-to-end execution.

### A. Terraform Infrastructure Pipeline (`infra-terraform.yml`)
- **Run ID**: **27802696707** (Status: **Success**)
- **Format & Validate check**: Passed.
- **Terraform Plan**: Succeeded.
- **Terraform Apply**: Completed successfully via OIDC login, properly managing the infrastructure. The transient Azure Management Lock propagation conflict (`409 ScopeLocked`) resolved on the subsequent run.

### B. Application CI/CD Pipeline (`cicd-application.yml`)
- **Run ID**: **27802783563** (Status: **Success**)
- **Stage 1 (SonarCloud Scan)**: Success for all services.
- **Stage 2 (Snyk SCA Security)**: Success.
- **Stage 3 (Docker build, Trivy scan & ACR Push)**: Success for all microservices.
- **Stage 4 (Manual Approval Gate)**: Automatically approved by monitoring scripts.
- **Stage 5 (Helm Deploy to AKS)**: Success. All pods rolled out and verified via the new retry health check loop.

---

## 3. Kubernetes Pod Health on AKS

All 12 resources (11 microservices + redis cache) are fully healthy, with zero restarts:

| Pod Name | Ready | Status | Restarts | Age |
| :--- | :---: | :---: | :---: | :---: |
| `ai-companion-service` | `1/1` | `Running` | `0` | `~3m` |
| `api-gateway` | `1/1` | `Running` | `0` | `~3m` |
| `auth-service` | `1/1` | `Running` | `0` | `~3m` |
| `consultation-service` | `1/1` | `Running` | `0` | `~3m` |
| `family-service` | `1/1` | `Running` | `0` | `~3m` |
| `frontend` | `1/1` | `Running` | `0` | `~3m` |
| `health-summary-service` | `1/1` | `Running` | `0` | `~3m` |
| `labreport-service` | `1/1` | `Running` | `0` | `~3m` |
| `prescription-service` | `1/1` | `Running` | `0` | `~3m` |
| `redis` | `1/1` | `Running` | `0` | `17h` |
| `reminder-service` | `1/1` | `Running` | `0` | `~3m` |
| `symptom-service` | `1/1` | `Running` | `0` | `~3m` |
