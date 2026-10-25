# Contrato: GET /assets

Contrato implementado por el backend. Consumido por `src/api/assets.ts`.

## Petición

```
GET /assets?limit=&cursor=&active=&kind=&criticality=
```

Ruta sin versión. El Customer lo resuelve el servidor: no se envía su id.

| Parámetro     | Comportamiento                                                                    |
|---------------|-----------------------------------------------------------------------------------|
| `limit`       | Por defecto 50, máximo 200. Fuera de rango o no numérico devuelve 400 (no recorta). |
| `cursor`      | String opaco tomado de un `next_cursor` anterior. Nunca se interpreta ni se construye. |
| `active`      | `true` (por defecto), `false` o `all`.                                            |
| `kind`        | `server`, `virtual_machine`, `workstation`, `network_device`.                     |
| `criticality` | `high`, `medium`, `low`. (`unknown` no es un filtro válido.)                      |

- El orden es fijo (name, source_id, record_id). No hay orden en el cliente.
- **Los filtros se repiten en cada página.** Un cursor enviado con filtros distintos a los
  de la petición que lo produjo devuelve 400. Cambiar un filtro descarta el cursor y vuelve
  a la primera página.
- Aún no existen la búsqueda por nombre (`q`) ni el filtro por dueño (`owner`).

## Respuesta (200)

```json
{
  "assets": [
    {
      "source_id": "uuid",
      "record_id": "SRV-001",
      "name": "prod-api-01",
      "description": "API server principal de producción",
      "kind": "server",
      "hardware": { "vendor": "Dell", "model": "PowerEdge R640" },
      "software": [
        { "role": "operating_system", "name": "Ubuntu", "version": "22.04",
          "product": { "vendor": "Canonical", "name": "Ubuntu" } }
      ],
      "criticality": "high",
      "exposure": null,
      "owner": { "email": "devops@example.com", "source": "imported" },
      "retired": false,
      "active": true,
      "inactive_since": null
    }
  ],
  "next_cursor": "opaco-o-null",
  "total": 312
}
```

- **Identidad**: el par `source_id` + `record_id`; no hay un id único.
- **Enumeraciones**: códigos snake_case en minúsculas; las etiquetas y su traducción son
  del frontend. `role`: `operating_system`, `application`. `exposure`: `internet_facing`,
  `internal`.
- **`null` explícito** (la clave siempre está): `hardware` (las máquinas virtuales no
  tienen), `software[].product` (Unidentified Component), `owner`, `criticality`,
  `exposure`. `software` siempre es un array, quizá vacío, ya en orden de presentación.
- `owner.source` es `declared` o `imported`; el valor declarado ya gana.
- `retired` (lo que dice la CMDB), `active` e `inactive_since` son tres hechos distintos.
- `total` cuenta los Assets que cumplen los filtros, sin paginar. `next_cursor` es `null`
  en la última página.
- Sin Assets o sin coincidencias: `{"assets": [], "next_cursor": null, "total": 0}`.

## Errores

Cuerpo `{"code": "...", "error": "..."}`.

| Status | `code`             | Causa                                                                 |
|--------|--------------------|-----------------------------------------------------------------------|
| `400`  | `invalid_request`  | `limit`, `kind`, `criticality` o `active` inválidos; cursor malformado o con otros filtros |
| `500`  | `internal_error`   | Error interno                                                         |

Con listas de opciones fijas, el frontend solo puede provocar un 400 con un cursor viejo o
alterado; en ese caso vuelve a la primera página.
