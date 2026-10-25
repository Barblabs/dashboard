import type { Translations } from './en'

export const es: Translations = {
  sidebar: {
    nav: {
      findings: 'Hallazgos',
      config: 'Configuración',
      notifications: 'Notificaciones',
    },
    footer: {
      course: 'Reto Lyft · TC3008C',
      stage: 'Etapa 3: diseminación y feedback',
    },
    language: {
      label: 'Idioma',
    },
  },
  placeholder: {
    comingSoon: 'Próximamente',
  },
  findings: {
    title: 'Hallazgos',
  },
  notifications: {
    title: 'Notificaciones',
  },
  status: {
    backHome: 'Volver al inicio',
    notFound: {
      title: 'Página no encontrada',
      message: 'La página que buscas no existe o fue movida.',
    },
    forbidden: {
      title: 'Acceso denegado',
      message: 'No tienes permiso para ver esta página.',
    },
  },
  config: {
    loading: 'Cargando configuración…',
    header: {
      title: 'Configuración',
      subtitle: 'Conecta tu CMDB para cargar el stack tecnológico.',
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
        disconnected: 'Sin conexión',
      },
    },
    form: {
      title: 'Conectar iTop',
      editTitle: 'Editar conexión de iTop',
      back: '← Cambiar CMDB',
      cancel: 'Cancelar',
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
        save: 'Guardar cambios',
        saving: 'Guardando…',
      },
      result: {
        success: 'Conexión exitosa. Puedes continuar con la sincronización.',
        testFailed: 'No se pudo conectar con iTop.',
        testNetworkError: 'Error de red al probar la conexión.',
        connectFailed: 'No se pudo guardar la conexión.',
      },
    },
    errors: {
      unreachable: 'No se pudo llegar a iTop. Revisa la dirección, el puerto y la red.',
      tlsError: 'Falló la conexión segura con iTop. Revisa su certificado TLS.',
      invalidCredentials: 'iTop rechazó el usuario o la contraseña.',
      unexpectedResponse:
        'La dirección respondió, pero no como iTop. Revisa que apunte a la URL base de iTop.',
      missingRestProfile:
        "El usuario '{{user}}' no tiene el perfil 'REST Services User' en iTop. Crea un usuario dedicado con ese perfil.",
      invalidRequest: 'La solicitud está incompleta. Revisa los campos.',
      invalidLogin: 'El backend rechazó el inicio de sesión. Revisa la dirección.',
      notConnected: 'No hay ningún CMDB conectado.',
      alreadyConnected: 'Ya hay un CMDB conectado. Desconéctalo primero.',
      syncInProgress: 'Ya hay una sincronización en curso. Inténtalo de nuevo en un momento.',
      syncFailed: 'La sincronización falló.',
      internalError: 'El servidor tuvo un error interno. Inténtalo de nuevo.',
    },
    connected: {
      badge: '{{provider}} conectado',
      lastSync: 'Última sincronización: {{time}}',
      never: 'nunca',
      lessThanAMinute: 'hace menos de un minuto',
      lastSyncFailed: 'La última sincronización falló {{time}}: {{error}}',
      syncSucceeded: 'Sincronización completa.',
      disconnectFailed: 'No se pudo desconectar el CMDB.',
      actions: {
        disconnect: 'Desconectar',
        edit: 'Editar conexión',
        sync: 'Sincronizar ahora',
        syncing: 'Sincronizando…',
        updateLogin: 'Actualizar credenciales',
      },
      confirm: {
        text: 'Esta acción desconectará el CMDB. Los activos sincronizados se conservan, marcados como inactivos. ¿Continuar?',
        confirm: 'Sí, desconectar',
        cancel: 'Cancelar',
      },
    },
    inventory: {
      title: 'Stack tecnológico',
      loading: 'Cargando inventario…',
      empty: 'No hay activos registrados en el inventario.',
      noMatches: 'Ningún activo coincide con estos filtros.',
      loadFailed: 'No se pudo cargar el inventario.',
      networkError: 'No se pudo contactar al servidor para cargar el inventario.',
      retry: 'Reintentar',
      total_one: '{{count}} activo',
      total_other: '{{count}} activos',
      filters: {
        label: 'Filtrar activos',
        active: 'Estado',
        kind: 'Tipo',
        criticality: 'Criticidad',
        allKinds: 'Todos los tipos',
        allCriticalities: 'Todas las criticidades',
        activity: {
          true: 'Activos',
          false: 'Inactivos',
          all: 'Todos',
        },
      },
      pagination: {
        label: 'Páginas',
        page: 'Página {{page}}',
        previous: 'Anterior',
        next: 'Siguiente',
      },
      columns: {
        asset: 'Activo',
        type: 'Tipo',
        os: 'Sistema operativo',
        criticality: 'Criticidad',
        owner: 'Dueño',
        status: 'Estado',
        details: 'Detalle',
      },
      kind: {
        server: 'Servidor',
        virtual_machine: 'Máquina virtual',
        workstation: 'Estación de trabajo',
        network_device: 'Dispositivo de red',
      },
      criticality: {
        high: 'Alta',
        medium: 'Media',
        low: 'Baja',
        unknown: 'Desconocida',
      },
      exposure: {
        internet_facing: 'Expuesto a internet',
        internal: 'Interno',
        undeclared: 'No declarada',
      },
      role: {
        operating_system: 'Sistema operativo',
        application: 'Aplicación',
      },
      status: {
        active: 'Activo',
        inactive: 'Inactivo',
        inactiveSince: 'Inactivo desde {{date}}',
      },
      owner: {
        declared: 'Declarado',
      },
      details: {
        show: 'Mostrar detalle de {{name}}',
        hide: 'Ocultar detalle de {{name}}',
        description: 'Descripción',
        hardware: 'Hardware',
        noHardware: 'Sin hardware registrado',
        exposure: 'Exposición',
        retired: 'Retirado en la CMDB',
        yes: 'Sí',
        no: 'No',
        software: 'Componentes de software',
        noSoftware: 'Sin componentes de software registrados',
        unidentified: 'No identificado',
        unidentifiedHelp: 'Sin Producto asociado: no se pueden verificar amenazas contra él.',
      },
    },
    selector: {
      title: 'Elige tu CMDB',
      subtitle: 'Selecciona de dónde viene tu inventario de activos.',
      select: 'Seleccionar',
      comingSoon: 'Próximamente',
    },
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
}
