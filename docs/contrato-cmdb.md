# Contrato CMDB

Documentación del contrato entre el dashboard y los endpoints `/cmdb/` del backend.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/cmdb/source` | Obtiene la fuente CMDB configurada |
| `POST` | `/cmdb/source` | Conecta una nueva fuente CMDB |
| `PUT` | `/cmdb/source` | Actualiza la fuente CMDB existente |
| `DELETE` | `/cmdb/source` | Desconecta la fuente CMDB |
| `POST` | `/cmdb/source/test` | Prueba un login sin guardarlo |
| `POST` | `/cmdb/source/sync` | Inicia una sincronización manual |

Los activos sincronizados se leen de `GET /assets`, fuera de `/cmdb/`. Los tipos de cada
endpoint están en `src/api/generated.ts`, generado del OpenAPI del backend.

## Preguntas abiertas

- Hoy `viewer` puede llamar `POST`/`PUT`/`DELETE /cmdb/source` y `POST /cmdb/source/sync`. Deberían quedar solo para `customer_admin`.
