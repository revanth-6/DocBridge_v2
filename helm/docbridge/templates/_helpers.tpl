{{/*
Expand the name of the chart.
*/}}
{{- define "docbridge.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "docbridge.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Construct the image URL for a microservice.
Expects a dict with 'name' and 'context'.
Usage: {{ include "docbridge.image" (dict "name" "auth-service" "context" .) }}
*/}}
{{- define "docbridge.image" -}}
{{- $registry := .context.Values.global.imageRegistry -}}
{{- $tag := .context.Values.global.imageTag -}}
{{- printf "%s/%s:%s" $registry .name $tag -}}
{{- end }}
