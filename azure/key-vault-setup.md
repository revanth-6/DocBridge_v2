# Azure Key Vault Setup

This document outlines the steps to securely manage environment variables and secrets using Azure Key Vault for the DocBridge AKS deployment.

## Prerequisites
- Azure CLI installed and authenticated (`az login`)
- An existing Azure Resource Group and AKS cluster

## Step 1: Create the Key Vault
```bash
az keyvault create \
  --name "docbridge-kv-prod" \
  --resource-group "docbridge-rg" \
  --location "eastus"
```

## Step 2: Store the Secrets
Add the following required secrets to the Key Vault. Do not store these in plaintext in your code repositories or CI/CD pipelines.

```bash
# Database Credentials
az keyvault secret set --vault-name "docbridge-kv-prod" --name "POSTGRES-USER" --value "dbadmin"
az keyvault secret set --vault-name "docbridge-kv-prod" --name "POSTGRES-PASSWORD" --value "<StrongPassword123!>"
az keyvault secret set --vault-name "docbridge-kv-prod" --name "POSTGRES-DB" --value "docbridge_db"

# JWT Authentication
az keyvault secret set --vault-name "docbridge-kv-prod" --name "JWT-SECRET" --value "<Base64EncodedSecureString>"

# Azure OpenAI (For AI Companion)
az keyvault secret set --vault-name "docbridge-kv-prod" --name "AZURE-OPENAI-API-KEY" --value "<YourOpenAIKey>"
az keyvault secret set --vault-name "docbridge-kv-prod" --name "AZURE-OPENAI-ENDPOINT" --value "https://<your-resource>.openai.azure.com/"
```

## Step 3: Link Key Vault to AKS using CSI Driver
To inject these secrets into the AKS pods securely, use the Azure Key Vault Provider for Secrets Store CSI Driver.

1. Enable the CSI Driver on the AKS cluster:
```bash
az aks enable-addons --addons azure-keyvault-secrets-provider --name myAKSCluster --resource-group docbridge-rg
```

2. Retrieve the Managed Identity client ID for the addon:
```bash
az aks show -g docbridge-rg -n myAKSCluster --query addonProfiles.azureKeyvaultSecretsProvider.identity.clientId -o tsv
```

3. Grant the AKS managed identity GET access to the Key Vault:
```bash
az keyvault set-policy -n "docbridge-kv-prod" --secret-permissions get --spn <CLIENT_ID>
```

4. The `aks-deployment.yml` uses `envFrom: secretRef`. You will deploy a `SecretProviderClass` and a mapped Kubernetes `Secret` to link them automatically.
