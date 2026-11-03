# Contrato CMDB

Documentación del contrato entre el dashboard y los endpoints `/cmdb/` del backend.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/cmdb/source` | Obtiene la fuente CMDB configurada |
| `POST` | `/cmdb/source` | Conecta una nueva fuente CMDB |
| `PUT` | `/cmdb/source` | Actualiza la fuente CMDB existente |
| `DELETE` | `/cmdb/source` | Desconecta la fuente CMDB |
| `POST` | `/cmdb/source/sync` | Inicia una sincronización manual |
| `GET` | `/cmdb/assets` | Lista los activos sincronizados |

## Preguntas abiertas

- Hoy `viewer` puede llamar `POST`/`PUT`/`DELETE /cmdb/source` y `POST /cmdb/source/sync`. Deberían quedar solo para `customer_admin`.
