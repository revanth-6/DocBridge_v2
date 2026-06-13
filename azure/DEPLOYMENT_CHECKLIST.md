# Final Pre-Deployment Checklist

Use this checklist prior to finalizing the production deployment of the DocBridge platform on Azure.

- [ ] All environment variables are set in Key Vault.
- [ ] Regression suite passes green in CI pipeline.
- [ ] Database migration is complete and verified.
- [ ] Redis is provisioned and rate limiter is switched.
- [ ] Gateway is the ONLY publicly exposed endpoint.
- [ ] All internal services are ClusterIP only.
- [ ] PM2 ecosystem is replaced by Kubernetes liveness probes.
- [ ] Azure OpenAI endpoint and keys are verified.
- [ ] SSL/TLS is configured on the Application Gateway.
