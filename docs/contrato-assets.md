# Contrato propuesto: GET /assets

> Propuesta del equipo de frontend para que el backend implemente este endpoint.
> Basada en el modelo de dominio real de `internal/inventory/`.

## Ruta

```
GET /assets
```

## Descripción

Devuelve todos los activos del inventario (activos e inactivos) para todas
las fuentes CMDB registradas. Los activos provienen de la tabla `assets` junto
con sus `software_components` y `asset_owners`.

## Autenticación

Por definir. El frontend asumirá que el backend agrega autenticación cuando
la implemente. Por ahora el endpoint puede ser abierto en local.

## Respuesta exitosa

**Status:** `200 OK`  
**Content-Type:** `application/json`

```json
{
  "assets": [
    {
      "record_id": "SRV-001",
      "name": "prod-api-01",
      "description": "API server principal de producción",
      "kind": "Server",
      "hardware": {
        "vendor": "Dell",
        "model": "PowerEdge R640"
      },
      "software": [
        {
          "role": "Operating System",
          "name": "Ubuntu",
          "version": "22.04",
          "product": {
            "vendor": "Canonical",
            "name": "Ubuntu"
          }
        },
        {
          "role": "Application",
          "name": "nginx",
          "version": "1.24.0",
          "product": {
            "vendor": "F5",
            "name": "nginx"
          }
        }
      ],
      "criticality": "High",
      "owner": "devops@example.com",
      "active": true
    }
  ]
}
```

## Campos

### Objeto raíz

| Campo    | Tipo           | Descripción                  |
|----------|----------------|------------------------------|
| `assets` | `Asset[]`      | Lista de activos del CMDB    |

### Asset

| Campo         | Tipo                   | Nullable | Descripción                                                       |
|---------------|------------------------|----------|-------------------------------------------------------------------|
| `record_id`   | `string`               | No       | ID del registro en el CMDB fuente                                 |
| `name`        | `string`               | No       | Nombre del activo                                                 |
| `description` | `string`               | No       | Descripción. Puede ser string vacío                               |
| `kind`        | `string` (enum)        | No       | Tipo de activo (ver abajo)                                        |
| `hardware`    | `Hardware \| null`     | Sí       | Solo presente en activos físicos                                  |
| `software`    | `SoftwareComponent[]`  | No       | Puede ser array vacío                                             |
| `criticality` | `string` (enum)        | No       | Criticidad del activo (ver abajo)                                 |
| `owner`       | `string \| null`       | Sí       | Email del dueño (declarado si existe, si no importado del CMDB)   |
| `active`      | `boolean`              | No       | `false` si `inactive_since` está presente en la BD                |

### Hardware

| Campo    | Tipo     | Descripción   |
|----------|----------|---------------|
| `vendor` | `string` | Fabricante    |
| `model`  | `string` | Modelo        |

### SoftwareComponent

| Campo     | Tipo               | Nullable | Descripción                     |
|-----------|--------------------|----------|---------------------------------|
| `role`    | `string` (enum)    | No       | `"Operating System"` o `"Application"` |
| `name`    | `string`           | No       | Nombre del componente           |
| `version` | `string`           | No       | Versión. Puede ser string vacío |
| `product` | `Product \| null`  | Sí       | Identificación del producto     |

### Product

| Campo    | Tipo     | Descripción      |
|----------|----------|------------------|
| `vendor` | `string` | Fabricante       |
| `name`   | `string` | Nombre del producto |

## Enumeraciones

### kind

Mapeo desde `inventory.AssetKind`:

| Valor             | Constante Go        |
|-------------------|---------------------|
| `"Server"`        | `Server = 1`        |
| `"Virtual Machine"` | `VirtualMachine = 2` |
| `"Workstation"`   | `Workstation = 3`   |
| `"Network Device"` | `NetworkDevice = 4` |

### criticality

Mapeo desde `inventory.Criticality`:

| Valor       | Constante Go              |
|-------------|---------------------------|
| `"Unknown"` | `CriticalityUnknown = 0`  |
| `"High"`    | `CriticalityHigh = 1`     |
| `"Medium"`  | `CriticalityMedium = 2`   |
| `"Low"`     | `CriticalityLow = 3`      |

## Errores

| Status | Descripción                                          |
|--------|------------------------------------------------------|
| `500`  | Error interno; body: `{"error": "mensaje"}`          |

## CORS

El backend necesitará habilitar CORS para el origen del frontend en local
(`http://localhost:5173` por defecto con Vite). En producción se configurará
el origen real del dashboard.

Cabeceras mínimas requeridas:

```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Preguntas abiertas

1. **Arquitecturas (App, Analítica, CRM, ERP):** El CMDB no tiene un campo
   de arquitectura. Los activos solo tienen `kind` (Server, VM, etc.) y
   `software`. ¿Cómo asignamos cada activo a una arquitectura de referencia?
   Opciones posibles: a) campo manual en el CMDB, b) etiqueta en `description`,
   c) tabla de mapeo en el backend, d) declaración en el dashboard.

2. **Paginación:** ¿El endpoint debe paginar cuando el inventario crece?
   ¿Tamaño de página sugerido?

3. **Filtrado por fuente CMDB:** ¿El front necesita ver activos por
   `cmdb_source_id`, o siempre todos juntos?
