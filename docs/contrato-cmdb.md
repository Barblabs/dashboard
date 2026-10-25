# Contrato: endpoints CMDB

> Contrato que barbackend sirve hoy (PR Barblabs/barbackend#66, issue #24).
> Reemplaza la propuesta anterior del frontend (`/cmdb/connection`, `/cmdb/test`,
> `/cmdb/connect`, `/cmdb/sync`). Las fuentes de verdad son, en barbackend,
> `README.md` (sección "HTTP API"), `internal/httpapi/httpapi.go`,
> `internal/httpapi/cmdb_source.go` e `internal/cmdb/provider.go`. Si algo de
> aquí difiere de esos archivos, mandan los archivos.

---

## Reglas comunes

**Errores.** Todo error responde:

```json
{ "code": "not_connected", "error": "mensaje legible" }
```

El front traduce los códigos que conoce y muestra `error` tal cual cuando el
código es desconocido: el backend puede agregar códigos sin coordinar el
despliegue. Excepción: una ruta inexistente devuelve el 404 en texto plano de gin.

| Código              | Significado                                                        |
|---------------------|--------------------------------------------------------------------|
| `invalid_request`   | Cuerpo malformado o campo faltante                                 |
| `invalid_login`     | Proveedor desconocido o login rechazado antes de contactar el CMDB (p. ej. URL malformada) |
| `not_connected`     | No hay CMDB Source conectada                                       |
| `already_connected` | Ya hay una CMDB Source conectada                                   |
| `sync_in_progress`  | Hay una Sync de la fuente en curso o confirmándose                 |
| `sync_failed`       | La Sync falló por una razón que el proveedor no clasificó          |
| `internal_error`    | Error del servidor; `error` siempre es `"internal server error"`   |

**Códigos de falla del CMDB** (en el resultado de `/test`, como 422 al conectar o
actualizar, como 502 al sincronizar):

| Código                 | Significado                                                 |
|------------------------|-------------------------------------------------------------|
| `unreachable`          | Falla de DNS, conexión rechazada o timeout                  |
| `tls_error`            | Falló el handshake TLS                                      |
| `invalid_credentials`  | iTop rechazó el usuario o la contraseña                     |
| `unexpected_response`  | No es iTop, respuesta malformada, o error de iTop ajeno al login |
| `missing_rest_profile` | El usuario no tiene el perfil `REST Services User` (solo iTop) |

**Timestamps:** RFC 3339, pueden traer fracciones de segundo y un offset distinto
de `Z`. Se parsean, no se comparan como texto.

**Proveedor:** hoy solo existe `"itop"`.

---

## GET /cmdb/source

La CMDB Source conectada, o `null`.

```json
{
  "provider": "itop",
  "url": "http://10.0.0.5:8000",
  "user": "barb-reader",
  "lastSync": "2026-10-20T18:35:00.123456Z",
  "lastSyncFailure": null
}
```

| Campo             | Tipo                                   | Notas                                                   |
|-------------------|----------------------------------------|---------------------------------------------------------|
| `provider`        | `string`                               | `"itop"`                                                |
| `url`             | `string`                               | URL base de iTop                                        |
| `user`            | `string \| null`                       | `null` en fuentes con token (solo se crean por CLI)     |
| `lastSync`        | `string \| null`                       | Fin de la última Sync **exitosa**                       |
| `lastSyncFailure` | `{ at: string, error: string } \| null` | Solo mientras la **última** Sync falló. Sin `code`.     |

Las credenciales nunca se devuelven. Errores: `500 internal_error`. No hay
historial de Syncs: se consulta este endpoint para ver el último resultado.

---

## POST /cmdb/source/test

Prueba un login contra el CMDB; no guarda nada.

**Cuerpo** (todos obligatorios):
```json
{ "provider": "itop", "url": "http://10.0.0.5:8000", "user": "barb-reader", "password": "<contraseña>" }
```

- `200` éxito: `{ "ok": true }`
- `200` falla (es un resultado, no un error HTTP):
  `{ "ok": false, "code": "missing_rest_profile", "error": "..." }`. En una falla
  `code` siempre está y es un código de falla del CMDB.
- `400` `invalid_request` / `invalid_login`; `500` `internal_error`.

---

## POST /cmdb/source

Conecta: prueba el login, guarda la fuente con las credenciales cifradas y
ejecuta la primera Sync. Puede tardar hasta 5 minutos.

**Cuerpo:** igual que `/test`. **200:** misma forma que `GET /cmdb/source`.

Si la primera Sync falla, **igual responde 200**, con `lastSync: null` y
`lastSyncFailure`; la fuente queda conectada y se puede volver a sincronizar.

| Status | Código                             | Cuándo                                |
|--------|------------------------------------|---------------------------------------|
| `400`  | `invalid_request`, `invalid_login` |                                       |
| `409`  | `already_connected`                | Hay que desconectar primero           |
| `422`  | código de falla del CMDB           | El CMDB rechazó el login; nada se guarda |
| `500`  | `internal_error`                   |                                       |

---

## PUT /cmdb/source

Reemplaza el login de la fuente conectada (p. ej. rotación de contraseña).
Conserva el proveedor, los activos y las declaraciones. **No** ejecuta Sync.

**Cuerpo:** `{ "url": "...", "user": "...", "password": "..." }` (sin `provider`).
**200:** misma forma que `GET /cmdb/source`.

| Status | Código                             | Cuándo                   |
|--------|------------------------------------|--------------------------|
| `400`  | `invalid_request`, `invalid_login` |                          |
| `404`  | `not_connected`                    |                          |
| `422`  | código de falla del CMDB           | Rechazado; nada cambia   |
| `500`  | `internal_error`                   |                          |

Cuando una Sync falla con `invalid_credentials`, el dashboard ofrece este formulario.

---

## POST /cmdb/source/sync

Ejecuta una Sync de la fuente conectada. Sin cuerpo.

```json
{ "lastSync": "2026-10-20T19:10:00Z", "created": 3, "updated": 12, "deactivated": 1, "reactivated": 0, "skipped": 0 }
```

`skipped` es solo un conteo. La Sync sobrevive a la request (cerrar la pestaña no
la cancela); solo la cortan el límite de 5 minutos o el apagado del servidor.

| Status | Código                                     | Cuándo                                         |
|--------|--------------------------------------------|------------------------------------------------|
| `404`  | `not_connected`                            |                                                |
| `409`  | `sync_in_progress`                         | Hay otra Sync en curso                         |
| `502`  | código de falla del CMDB o `sync_failed`   | La Sync falló; queda como `lastSyncFailure`    |
| `500`  | `internal_error`                           |                                                |

---

## DELETE /cmdb/source

Desconecta. **No borra nada:** la fuente y los activos quedan guardados, los
activos pasan a inactivos y no se aceptan más Syncs de esa fuente. Conectar de
nuevo crea una CMDB Source nueva.

`204` sin cuerpo. `404` `not_connected`; `409` `sync_in_progress` (mientras una
Sync se confirma); `500` `internal_error`.

---

## CORS y servidor

- Orígenes permitidos en `CORS_ALLOWED_ORIGINS` del backend (separados por coma;
  en local, `http://localhost:5173`).
- El preflight permite `GET, PUT, DELETE` y el header `Content-Type`; se cachea
  10 minutos. Un origen no permitido recibe 403 en el preflight.
- El servidor escucha en `:8080` salvo que se defina `PORT`. `GET /ping` es el
  chequeo de vida.

---

## Decisiones (antes preguntas abiertas)

1. **Contraseña:** el backend cifra las credenciales y las guarda en Postgres. El
   front envía la contraseña real.
2. **Al desconectar:** no se borra nada; los activos pasan a inactivos; sin
   período de gracia; reconectar crea una fuente nueva.
3. **Multi-fuente:** una CMDB Source conectada por cliente. La API no tiene IDs:
   todo actúa sobre "la" fuente conectada.
4. **Autenticación:** no implementada. Cada request actúa por un cliente fijo en la
   configuración del servidor, así que estos endpoints (incluido `/test`, que
   puede llegar a cualquier URL) son solo para desarrollo local hasta que exista
   autenticación. Ningún issue del backend la sigue todavía.

## Lo que no existe

Historial de Syncs, registros omitidos individuales, `code` en
`lastSyncFailure` y headers de autenticación. Si la UI los necesita, se abre un
issue en `Barblabs/barbackend`.
