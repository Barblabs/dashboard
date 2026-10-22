import type { Translations } from './en'

export const es: Translations = {
  sidebar: {
    nav: {
      findings: 'Hallazgos',
      config: 'Configuración',
      notifications: 'Notificaciones',
    },
    footer: {
      stage: 'Etapa 3: diseminación y feedback',
    },
    language: {
      label: 'Idioma',
    },
  },
  config: {
    loading: 'Cargando configuración…',
    header: {
      title: 'Configuración',
      subtitle: 'Conecta tu CMDB para cargar el stack tecnológico.',
      mockBadge: 'Datos de ejemplo',
    },
    steps: {
      title: 'Conectar CMDB',
      description:
        'BARBATTACK lee el inventario de activos desde tu CMDB. Sin una conexión no hay stack que comparar contra los feeds de vulnerabilidades.',
      items: {
        choose: 'Elige tu CMDB',
        credentials: 'Ingresa la dirección y el usuario',
        connect: 'Conecta y sincroniza',
      },
      status: {
        connected: 'Conectado',
        disconnected: 'Sin conexión',
      },
    },
    selector: {
      title: 'Elige tu CMDB',
      subtitle: 'Selecciona de dónde viene tu inventario de activos.',
      select: 'Seleccionar',
      comingSoon: 'Próximamente',
      providers: {
        itop: {
          name: 'iTop',
          description:
            'CMDB de código abierto. Se conecta por su API REST con un usuario de solo lectura.',
        },
        servicenow: {
          name: 'ServiceNow',
          description: 'Integración planeada para una siguiente versión.',
        },
        other: {
          name: 'Otra CMDB',
          description: 'Conexión por API genérica o archivo de inventario.',
        },
      },
    },
  },
}
