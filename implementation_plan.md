# Implementation Plan — Pipeline Security Fixes and Approval Gate Corrections

This plan details the implementation steps to remove all programmatic auto-approval logic from all workflow files, clean up `template-approval-gate.yml` to rely purely on GitHub Environments, and introduce a manual destroy approval gate in the Terraform Infrastructure Pipeline.

## User Review Required

> [!IMPORTANT]
> **Manual Environment Configuration Verification**: 
> You must verify that the `production` environment in your GitHub repository Settings has **Required reviewers** enabled and your account (`revanth-6`) configured as the required reviewer. GitHub Actions will handle the pauses automatically once the workflows reference this environment.

---

## Proposed Changes

### GitHub Workflows

#### [MODIFY] [template-approval-gate.yml](file:///c:/Users/admin/Downloads/DocBridge/.github/workflows/template-approval-gate.yml)
- Replace the entire file contents to match the requested cleaner structure.
- Remove the programmatic auto-approval scripts/outputs and rely solely on the `environment: ${{ inputs.environment }}` declaration.
- Keep the `Send Approval Request Email` step using `dawidd6/action-send-mail@v3` for notifications.
- Set the `Set Approved Output` step outputs cleanly.

#### [MODIFY] [infra-terraform.yml](file:///c:/Users/admin/Downloads/DocBridge/.github/workflows/infra-terraform.yml)
- **Terraform Plan Step**: Update the plan job step to support a conditional checks block. If the action is `destroy`, it runs `terraform plan -destroy` to output a preview of the resources to be deleted.
- **Destroy Approval Gate Job**: Add the `destroy-approval-gate` job that targets the `production` environment, pausing for manual approval and sending a warning email describing the permanent deletion of resources.
- **Terraform Apply Job**: Modify the job execution condition to explicitly exclude manual dispatch runs where `action == 'destroy'`.
- **Terraform Destroy Job**: Update the `needs` clause to depend on `destroy-approval-gate` instead of `terraform-plan`. Update warning and completion email steps.

---

## Verification Plan

### Automated Tests
- Run GitHub Actions validation locally (if tools like `action-validator` are present, or push to main to trigger GitHub's parser).

### Manual Verification
- **Verification 1**: Push a minor change (e.g. comment change) to the codebase and monitor the `DocBridge Application CI/CD` pipeline. Verify it pauses at the Stage 4 Approval Gate with a "Waiting" status and resumes only after manual approval.
- **Verification 2**: Run the `Terraform Infrastructure Pipeline` via manual dispatch with `action = destroy`. Verify that the plan step shows a deletion preview, the `destroy-approval-gate` pauses with a "Waiting" status, and clicking Reject skips the `terraform-destroy` job entirely.
