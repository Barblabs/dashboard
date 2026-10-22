export const en = {
  sidebar: {
    nav: {
      findings: 'Findings',
      config: 'Configuration',
      notifications: 'Notifications',
    },
    footer: {
      stage: 'Stage 3: dissemination and feedback',
    },
    language: {
      label: 'Language',
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
        connected: 'Connected',
        disconnected: 'No connection',
      },
    },
    form: {
      title: 'Connect iTop',
      back: '← Change CMDB',
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
      },
      result: {
        success: 'Connection successful. You can continue with the sync.',
        testFailed: 'Could not connect to iTop.',
        testNetworkError: 'Network error while testing the connection.',
        connectFailed: 'Could not save the connection.',
      },
      testErrors: {
        missingRestProfile:
          "The user '{{user}}' does not have the 'REST Services User' profile in iTop. Create a dedicated user with that profile.",
      },
    },
    selector: {
      title: 'Choose your CMDB',
      subtitle: 'Select where your asset inventory comes from.',
      select: 'Select',
      comingSoon: 'Coming soon',
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
  },
}

export type Translations = typeof en
