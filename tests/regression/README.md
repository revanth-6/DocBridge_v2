# DocBridge Regression Test Suite

This suite provides permanent guards against regressions of the vulnerabilities discovered during the system assault test.

## Running the tests
From the project root:
```bash
npm run test:regression
```

## What each file covers

- **security.test.js**: XSS, Payload Limits (DoS), JWT presence/expiry/tampering, stack trace leaks, internal port bindings.
- **stability.test.js**: Double DELETEs (preventing unhandled rejections), idempotency keys, route latency.
- **integrity.test.js**: Health Summary serviceStatus, partial degradation via PM2, data isolation.
- **crud.test.js**: Full Happy Path CRUD and Zod schema validation rules.

## Interpreting Failures

If `run-all.js` exits with code 1, the CI/CD pipeline will fail and block merging to `main`. 
The console output will indicate exactly which assertion failed and why. Fix the underlying microservice code and re-run.

## Adding a New Test

1. Open the relevant `.test.js` file.
2. Follow the instructions in the top comment block to create a new `async function`.
3. Return `{ name: 'Feature Name', passed: boolean, reason: '...' }`.
4. Add your function to the `tests` array at the bottom.
