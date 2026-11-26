# Despliegue (S3 + CloudFront)

Cada push a `main` que pasa el check `ci` (build, lint, knip y test) ejecuta el job
`deploy` de `.github/workflows/ci.yml`: compila con los valores del
environment `production`, sube `dist/` al bucket y crea una invalidación de
`/index.html`. `dev` nunca despliega. El job está fuera del check `ci`, así que
un despliegue fallido no bloquea merges.

## Variables del environment `production`

La infraestructura (bucket, distribución, OAC, rol IAM) vive en el directorio
de Terraform, no en este repo. El contrato son estas variables (no secrets) en
GitHub:

| Variable | Origen |
|---|---|
| `AWS_REGION` | Terraform |
| `AWS_ROLE_ARN` | Output de Terraform |
| `S3_BUCKET` | Output de Terraform |
| `CLOUDFRONT_DISTRIBUTION_ID` | Output de Terraform |
| `VITE_API_URL`, `VITE_COGNITO_REGION`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID` | Backend / Cognito |

Si falta alguna, el job falla antes de compilar y lista las que faltan.

## Requisitos del lado de Terraform

- **Trust policy OIDC**: el repo usa subject claims inmutables, así que el
  `sub` debe ser
  `repo:Barblabs@338384335/dashboard@1406600557:environment:production`
  (con `aud` = `sts.amazonaws.com`). La forma con nombres
  (`repo:Barblabs/dashboard:...`) es rechazada.
- **Permisos del rol**: `s3:ListBucket`, `s3:PutObject` y `s3:DeleteObject` en
  el bucket, y `cloudfront:CreateInvalidation` en la distribución.
- **Rutas del SPA**: la app usa history routing, así que CloudFront debe
  responder `/index.html` con status 200 ante errores 403 y 404 (custom error
  responses); si no, abrir `/tenants` directamente falla.
- La app se sirve desde la raíz de la distribución (Vite usa `base: '/'`).
