export const en = {
  sidebar: {
    nav: {
      findings: 'Findings',
      config: 'Configuration',
      notifications: 'Notifications',
    },
    footer: {
      course: 'Reto Lyft · TC3008C',
      stage: 'Stage 3: dissemination and feedback',
    },
    language: {
      label: 'Language',
    },
  },
  placeholder: {
    comingSoon: 'Coming soon',
  },
  findings: {
    title: 'Findings',
  },
  notifications: {
    title: 'Notifications',
  },
  status: {
    backHome: 'Back to home',
    notFound: {
      title: 'Page not found',
      message: 'The page you are looking for does not exist or was moved.',
    },
    forbidden: {
      title: 'Access denied',
      message: 'You do not have permission to view this page.',
    },
  },
  config: {
    loading: 'Loading configuration…',
    header: {
      title: 'Configuration',
      subtitle: 'Connect your CMDB to load the tech stack.',
    },
    steps: {
      title: 'Connect CMDB',
      description:
        'BARBATTACK reads the asset inventory from your CMDB. Without a connection there is no stack to compare against the vulnerability feeds.',
      items: {
        choose: 'Choose your CMDB',
        credentials: 'Enter the address and user',
        connect: 'Connect and sync',
      },
      status: {
        disconnected: 'No connection',
      },
    },
    form: {
      title: 'Connect iTop',
      editTitle: 'Edit iTop connection',
      back: '← Change CMDB',
      cancel: 'Cancel',
      url: {
        label: 'iTop address (IP or URL)',
        help: 'Include the port if it is not 80 or 443.',
        required: 'The address is required.',
        scheme: 'Must start with http:// or https://',
      },
      user: {
        label: 'User',
        help: 'User with the REST Services User profile and read-only permissions.',
        required: 'The user is required.',
      },
      password: {
        label: 'Password',
        help: 'Sent to the backend. Not stored in the browser.',
        required: 'The password is required.',
      },
      actions: {
        test: 'Test connection',
        testing: 'Testing…',
        connect: 'Connect and sync',
        connecting: 'Connecting…',
        save: 'Save changes',
        saving: 'Saving…',
      },
      result: {
        success: 'Connection successful. You can continue with the sync.',
        testFailed: 'Could not connect to iTop.',
        testNetworkError: 'Network error while testing the connection.',
        connectFailed: 'Could not save the connection.',
      },
    },
    errors: {
      unreachable: 'Could not reach iTop. Check the address, the port and the network.',
      tlsError: 'The secure connection to iTop failed. Check its TLS certificate.',
      invalidCredentials: 'iTop rejected the user or the password.',
      unexpectedResponse:
        'The address answered, but not as iTop. Check that it points to the iTop base URL.',
      missingRestProfile:
        "The user '{{user}}' does not have the 'REST Services User' profile in iTop. Create a dedicated user with that profile.",
      invalidRequest: 'The request is incomplete. Check the fields.',
      invalidLogin: 'The backend rejected the login. Check the address.',
      notConnected: 'There is no CMDB connected.',
      alreadyConnected: 'A CMDB is already connected. Disconnect it first.',
      syncInProgress: 'A sync is already running. Try again in a moment.',
      syncFailed: 'The sync failed.',
      internalError: 'The server had an internal error. Try again.',
    },
    connected: {
      badge: '{{provider}} connected',
      lastSync: 'Last sync: {{time}}',
      never: 'never',
      lessThanAMinute: 'less than a minute ago',
      lastSyncFailed: 'Last sync failed {{time}}: {{error}}',
      disconnectFailed: 'Could not disconnect the CMDB.',
      actions: {
        disconnect: 'Disconnect',
        edit: 'Edit connection',
        sync: 'Sync now',
        syncing: 'Syncing…',
        updateLogin: 'Update credentials',
      },
      confirm: {
        text: 'This will disconnect the CMDB. Synced assets are kept, marked as inactive. Continue?',
        confirm: 'Yes, disconnect',
        cancel: 'Cancel',
      },
    },
    inventory: {
      title: 'Tech stack',
      loading: 'Loading inventory…',
      empty: 'There are no assets in the inventory.',
      noMatches: 'No assets match these filters.',
      loadFailed: 'Could not load the inventory.',
      networkError: 'Could not reach the server to load the inventory.',
      retry: 'Try again',
      total_one: '{{count}} asset',
      total_other: '{{count}} assets',
      filters: {
        label: 'Filter assets',
        active: 'Status',
        kind: 'Type',
        criticality: 'Criticality',
        allKinds: 'All types',
        allCriticalities: 'All criticalities',
        activity: {
          true: 'Active',
          false: 'Inactive',
          all: 'All',
        },
      },
      pagination: {
        label: 'Pages',
        page: 'Page {{page}}',
        previous: 'Previous',
        next: 'Next',
      },
      columns: {
        asset: 'Asset',
        type: 'Type',
        os: 'Operating system',
        criticality: 'Criticality',
        owner: 'Owner',
        status: 'Status',
        details: 'Details',
      },
      kind: {
        server: 'Server',
        virtual_machine: 'Virtual Machine',
        workstation: 'Workstation',
        network_device: 'Network Device',
      },
      criticality: {
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        unknown: 'Unknown',
      },
      exposure: {
        internet_facing: 'Internet-facing',
        internal: 'Internal',
        undeclared: 'Not declared',
      },
      role: {
        operating_system: 'Operating System',
        application: 'Application',
      },
      status: {
        active: 'Active',
        inactive: 'Inactive',
        inactiveSince: 'Inactive since {{date}}',
      },
      owner: {
        declared: 'Declared',
      },
      details: {
        show: 'Show details of {{name}}',
        hide: 'Hide details of {{name}}',
        description: 'Description',
        hardware: 'Hardware',
        noHardware: 'No hardware recorded',
        exposure: 'Exposure',
        retired: 'Retired in the CMDB',
        yes: 'Yes',
        no: 'No',
        software: 'Software Components',
        noSoftware: 'No Software Components recorded',
        unidentified: 'Unidentified',
        unidentifiedHelp: 'Not matched to a Product: threats cannot be checked against it.',
      },
    },
    selector: {
      title: 'Choose your CMDB',
      subtitle: 'Select where your asset inventory comes from.',
      select: 'Select',
      comingSoon: 'Coming soon',
    },
    providers: {
      itop: {
        name: 'iTop',
        description: 'Open source CMDB. Connects through its REST API with a read-only user.',
      },
      servicenow: {
        name: 'ServiceNow',
        description: 'Integration planned for a future release.',
      },
      other: {
        name: 'Other CMDB',
        description: 'Connection through a generic API or an inventory file.',
      },
    },
  },
}

export type Translations = typeof en
