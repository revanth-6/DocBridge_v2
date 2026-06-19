# Pipeline Security Fixes and Approval Gate Corrections Checklist

- [x] Clean up template-approval-gate.yml
- [x] Update infra-terraform.yml
  - [x] Add destroy-approval-gate job
  - [x] Update terraform-destroy job dependencies and steps
  - [x] Exclude action=destroy from terraform-apply job
  - [x] Support -destroy flag in terraform-plan step
- [/] Push changes and verify
