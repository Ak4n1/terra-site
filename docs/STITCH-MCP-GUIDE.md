# Stitch MCP Guide (Codex) - Reutilizable

Esta guía deja documentado lo que ya configuraste para no repetir todo en cada chat/proyecto.

## 1) Estado actual (YA HECHO)

- Google Cloud SDK local instalado en:
  - `C:\Users\JeeP_\.stitch-mcp\google-cloud-sdk\bin\gcloud.cmd`
- ADC (Application Default Credentials) ya autenticado.
- Servicio Stitch MCP habilitado en GCP para el proyecto `juegonaves`.
- Codex MCP configurado con proxy `@_davideast/stitch-mcp`.

## 2) ¿Tengo que hacer todo de nuevo en otro chat?

No.  
Si estás en la misma PC y mismo usuario (`JeeP_`), normalmente no repetís setup.

Solo abrís un nuevo chat y usás Stitch directo.

## 3) Comandos de chequeo rápido

```powershell
$env:CLOUDSDK_CONFIG='C:\Users\JeeP_\.stitch-mcp\config'
$env:PATH='C:\Users\JeeP_\.stitch-mcp\google-cloud-sdk\bin;' + $env:PATH
npx @_davideast/stitch-mcp doctor --verbose
```

Si todo está bien, vas a ver checks en verde.

## 4) Cambiar de proyecto GCP (sin reinstalar nada)

Cuando quieras usar otro proyecto:

```powershell
$env:CLOUDSDK_CONFIG='C:\Users\JeeP_\.stitch-mcp\config'
& 'C:\Users\JeeP_\.stitch-mcp\google-cloud-sdk\bin\gcloud.cmd' config set project TU_PROJECT_ID
```

Opcional (alinear cuota ADC con el proyecto activo):

```powershell
& 'C:\Users\JeeP_\.stitch-mcp\google-cloud-sdk\bin\gcloud.cmd' auth application-default set-quota-project TU_PROJECT_ID
```

## 5) Habilitar Stitch en un proyecto nuevo (solo 1 vez por proyecto)

```powershell
$env:CLOUDSDK_CONFIG='C:\Users\JeeP_\.stitch-mcp\config'
& 'C:\Users\JeeP_\.stitch-mcp\google-cloud-sdk\bin\gcloud.cmd' beta services mcp enable stitch.googleapis.com --project=TU_PROJECT_ID
```

Si pregunta confirmación, responder `y`.

## 6) Nuevo proyecto de código (ej: después de `web_3d`)

No importa cómo se llame la carpeta (`web_3d`, `mi_nuevo_site`, etc).  
Stitch se ata al **proyecto GCP activo**, no al nombre de carpeta local.

Flujo recomendado para un proyecto nuevo:

1. Crear carpeta local nueva.
2. Cambiar `gcloud` al proyecto GCP que vas a usar (`config set project ...`).
3. Correr `doctor --verbose`.
4. Trabajar normal con prompts de Stitch.

## 7) Si falla auth en otro día/chat

Re-login ADC (rápido):

```powershell
$env:CLOUDSDK_CONFIG='C:\Users\JeeP_\.stitch-mcp\config'
& 'C:\Users\JeeP_\.stitch-mcp\google-cloud-sdk\bin\gcloud.cmd' auth application-default login
```

## 8) Ejemplo de inicio en chat nuevo

Podés pegar algo así:

```txt
Usá Stitch MCP con mi proyecto GCP activo.
Quiero una landing con hero 3D para [nombre del producto].
Primero listá mis projects y elegí [id/nombre].
```

## 9) Nota sobre Codex Skills (`.agents` vs `.codex`)

- Tus skills masivas están en `C:\Users\JeeP_\.agents\skills`.
- Codex puede usarlas si las nombrás en el prompt.
- No hace falta copiar todo a `.codex` para trabajar.

