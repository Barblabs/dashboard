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
      mockBadge: 'Sample data',
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
      // Translations is derived from this file: it must contain every plural form any
      // language needs, such as the Spanish many form.
      count_one: '{{count}} asset · source: {{source}}',
      count_many: '{{count}} assets · source: {{source}}',
      count_other: '{{count}} assets · source: {{source}}',
      loading: 'Loading inventory…',
      empty: 'There are no assets in the inventory.',
      columns: {
        component: 'Component',
        type: 'Type',
        os: 'Operating system',
        criticality: 'Criticality',
        owner: 'Owner',
        status: 'Status',
      },
      kind: {
        Server: 'Server',
        'Virtual Machine': 'Virtual Machine',
        Workstation: 'Workstation',
        'Network Device': 'Network Device',
      },
      criticality: {
        High: 'High',
        Medium: 'Medium',
        Low: 'Low',
        Unknown: 'Unknown',
      },
      status: {
        active: 'Active',
        inactive: 'Inactive',
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
