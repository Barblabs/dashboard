# Contrato propuesto: endpoints CMDB

> Propuesta del equipo de frontend. El dashboard necesita estos cinco endpoints
> para el flujo de conexión al CMDB. El backend actual gestiona las fuentes
> desde el CLI (`source add` / `sync`); estos endpoints expondrían las mismas
> operaciones vía HTTP.

---

## GET /cmdb/connection

Devuelve la conexión CMDB activa del cliente autenticado, o `null` si no hay ninguna.

**Respuesta 200 — con conexión:**
```json
{
  "provider": "itop",
  "url": "http://10.0.0.5:8000",
  "user": "barb-reader",
  "lastSync": "2026-10-20T18:35:00Z"
}
```

**Respuesta 200 — sin conexión:**
```json
null
```

| Campo      | Tipo               | Descripción                                          |
|------------|--------------------|------------------------------------------------------|
| `provider` | `"itop"`           | Identificador del proveedor CMDB                     |
| `url`      | `string`           | URL base del iTop                                    |
| `user`     | `string`           | Usuario de solo lectura                              |
| `lastSync` | `string ISO` / `null` | Timestamp de la última sincronización exitosa   |

> **Nota:** La contraseña nunca se devuelve. El backend la almacena como
> referencia a una variable de entorno (ver pregunta abierta).

---

## POST /cmdb/test

Prueba la conexión con las credenciales proporcionadas sin guardar nada.

**Cuerpo:**
```json
{
  "url": "http://10.0.0.5:8000",
  "user": "barb-reader",
  "password": "s3cr3t"
}
```

**Respuesta 200 — éxito:**
```json
{ "ok": true }
```

**Respuesta 200 — fallo de conexión** (no es un error HTTP, es un resultado):
```json
{
  "ok": false,
  "error": "El usuario 'barb-reader' no tiene el perfil 'REST Services User'."
}
```

**Errores HTTP:**

| Status | Descripción                              |
|--------|------------------------------------------|
| `400`  | Cuerpo inválido (campo faltante, URL malformada) |
| `500`  | Error interno del servidor               |

---

## POST /cmdb/connect

Registra la fuente CMDB y ejecuta la primera sincronización.

Internamente equivale a `./barbackend source add --provider itop …` seguido
de `./barbackend sync --source <id>`.

**Cuerpo:** igual que `/cmdb/test`.

**Respuesta 200:**
```json
{
  "provider": "itop",
  "url": "http://10.0.0.5:8000",
  "user": "barb-reader",
  "lastSync": "2026-10-20T18:35:00Z"
}
```

**Errores HTTP:**

| Status | Descripción                                         |
|--------|-----------------------------------------------------|
| `400`  | Cuerpo inválido                                     |
| `409`  | Ya existe una conexión activa (desconectar primero) |
| `422`  | Credenciales rechazadas por iTop                    |
| `500`  | Error interno                                       |

---

## POST /cmdb/sync

Ejecuta una sincronización manual de la fuente CMDB activa.

Internamente equivale a `./barbackend sync --source <id>`.

**Cuerpo:** vacío `{}`.

**Respuesta 200:**
```json
{
  "lastSync": "2026-10-20T19:10:00Z",
  "created": 3,
  "updated": 12,
  "deactivated": 1,
  "reactivated": 0,
  "skipped": 0
}
```

**Errores HTTP:**

| Status | Descripción                          |
|--------|--------------------------------------|
| `404`  | No hay fuente CMDB conectada         |
| `500`  | Error de red o error interno         |

---

## DELETE /cmdb/connection

Elimina la fuente CMDB activa. No elimina los activos ya sincronizados
(decisión pendiente — ver preguntas abiertas).

**Respuesta 204:** sin cuerpo.

**Errores HTTP:**

| Status | Descripción                          |
|--------|--------------------------------------|
| `404`  | No hay fuente CMDB conectada         |
| `500`  | Error interno                        |

---

## CORS

El backend necesitará habilitar CORS para el origen del front en local
(`http://localhost:5173`). Ver también `docs/contrato-assets.md`.

---

## Preguntas abiertas

1. **Almacenamiento de la contraseña:** hoy el backend guarda el *nombre*
   de una variable de entorno, no la contraseña. Si el usuario la escribe
   en el dashboard, ¿dónde se guarda y cómo se cifra? Opciones: a) el
   backend la cifra y almacena en Postgres, b) se pide al ops que la
   exporte como variable de entorno y el front solo envía el nombre de la
   variable, c) se usa un gestor de secretos externo.

2. **Datos al desconectar:** ¿`DELETE /cmdb/connection` borra también los
   activos sincronizados en Postgres, o solo la fuente? Si los borra,
   ¿hay un período de gracia?

3. **Multi-fuente:** el modelo de `CMDBSource` admite múltiples fuentes por
   cliente. El flujo actual del front asume una sola. ¿Lo ampliamos?

4. **Autenticación y autorización:** el backend no tiene autenticación. Estos
   endpoints cambian la conexión al CMDB y deben quedar restringidos al rol
   de administrador. ¿Cuándo y cómo agregamos la autenticación (Cognito u
   otro)?
