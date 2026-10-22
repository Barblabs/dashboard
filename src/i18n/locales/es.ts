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
    form: {
      title: 'Conectar iTop',
      back: '← Cambiar CMDB',
      url: {
        label: 'Dirección de iTop (IP o URL)',
        help: 'Incluye el puerto si no es el 80 o el 443.',
        required: 'La dirección es obligatoria.',
        scheme: 'Debe comenzar con http:// o https://',
      },
      user: {
        label: 'Usuario',
        help: 'Usuario con perfil REST Services User y permisos de solo lectura.',
        required: 'El usuario es obligatorio.',
      },
      password: {
        label: 'Contraseña',
        help: 'Se envía al backend. No se guarda en el navegador.',
        required: 'La contraseña es obligatoria.',
      },
      actions: {
        test: 'Probar conexión',
        testing: 'Probando…',
        connect: 'Conectar y sincronizar',
        connecting: 'Conectando…',
      },
      result: {
        success: 'Conexión exitosa. Puedes continuar con la sincronización.',
        testFailed: 'No se pudo conectar con iTop.',
        testNetworkError: 'Error de red al probar la conexión.',
        connectFailed: 'No se pudo guardar la conexión.',
      },
      testErrors: {
        missingRestProfile:
          "El usuario '{{user}}' no tiene el perfil 'REST Services User' en iTop. Crea un usuario dedicado con ese perfil.",
      },
    },
    connected: {
      badge: 'iTop conectado',
      lastSync: 'Última sincronización: {{time}}',
      never: 'nunca',
      lessThanAMinute: 'hace menos de un minuto',
      actions: {
        disconnect: 'Desconectar',
        edit: 'Editar conexión',
        sync: 'Sincronizar ahora',
        syncing: 'Sincronizando…',
      },
      confirm: {
        text: 'Esta acción desconectará el CMDB y eliminará la configuración guardada. ¿Continuar?',
        confirm: 'Sí, desconectar',
        cancel: 'Cancelar',
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
