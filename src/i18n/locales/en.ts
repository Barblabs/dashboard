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
