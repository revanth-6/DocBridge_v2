# Azure Database for PostgreSQL Migration

This document outlines the steps to migrate the local Postgres database (`docbridge_db`) to Azure Database for PostgreSQL Flexible Server, complete with PgBouncer.

## Step 1: Provision the Flexible Server
```bash
az postgres flexible-server create \
  --name docbridge-pg-prod \
  --resource-group docbridge-rg \
  --location eastus \
  --admin-user dbadmin \
  --admin-password "<StrongPassword123!>" \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose \
  --version 15
```

## Step 2: Enable PgBouncer
PgBouncer is built into Flexible Server. Enable it to prevent connection exhaustion.
```bash
az postgres flexible-server parameter set \
  --resource-group docbridge-rg \
  --server-name docbridge-pg-prod \
  --name pgbouncer.enabled \
  --value true
```

Restart the server to apply the changes:
```bash
az postgres flexible-server restart --name docbridge-pg-prod -g docbridge-rg
```

## Step 3: Migrate Local Data

1. **Dump the local database:**
```bash
pg_dump -h localhost -U <local_user> -F c -b -v -f "docbridge_db.dump" docbridge_db
```

2. **Create the database in Azure:**
```bash
az postgres flexible-server db create \
  --resource-group docbridge-rg \
  --server-name docbridge-pg-prod \
  --database-name docbridge_db
```

3. **Restore to Azure Flexible Server:**
*Note: Include the `?pgbouncer=true` suffix if connecting through PgBouncer.*
```bash
pg_restore -h docbridge-pg-prod.postgres.database.azure.com -U dbadmin -d docbridge_db -v "docbridge_db.dump"
```

## Step 4: Connection String Format
For all DocBridge microservices, the `.env` connection details or Key Vault secrets should be configured as:

```env
DB_HOST=docbridge-pg-prod.postgres.database.azure.com
DB_USER=dbadmin
DB_PASSWORD=<StrongPassword123!>
DB_NAME=docbridge_db
```
*Note: Make sure to allow network access from your AKS cluster to the Postgres Flexible Server.*
