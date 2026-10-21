import type { AssetsResponse } from '../api/types'

export const mockAssetsResponse: AssetsResponse = {
  assets: [
    {
      record_id: 'SRV-001',
      name: 'prod-api-01',
      description: 'API server principal de producción',
      kind: 'Server',
      hardware: { vendor: 'Dell', model: 'PowerEdge R640' },
      software: [
        {
          role: 'Operating System',
          name: 'Ubuntu',
          version: '22.04',
          product: { vendor: 'Canonical', name: 'Ubuntu' },
        },
        {
          role: 'Application',
          name: 'nginx',
          version: '1.24.0',
          product: { vendor: 'F5', name: 'nginx' },
        },
      ],
      criticality: 'High',
      owner: 'devops@example.com',
      active: true,
    },
    {
      record_id: 'VM-002',
      name: 'analytics-worker-03',
      description: 'Worker de procesamiento de eventos',
      kind: 'Virtual Machine',
      hardware: null,
      software: [
        {
          role: 'Operating System',
          name: 'Debian',
          version: '12',
          product: { vendor: 'Debian', name: 'Debian GNU/Linux' },
        },
        {
          role: 'Application',
          name: 'Apache Kafka',
          version: '3.6.1',
          product: { vendor: 'Apache', name: 'Kafka' },
        },
      ],
      criticality: 'Medium',
      owner: 'data-eng@example.com',
      active: true,
    },
    {
      record_id: 'SRV-003',
      name: 'crm-db-primary',
      description: 'Base de datos primaria del CRM',
      kind: 'Server',
      hardware: { vendor: 'HPE', model: 'ProLiant DL380' },
      software: [
        {
          role: 'Operating System',
          name: 'RHEL',
          version: '9.2',
          product: { vendor: 'Red Hat', name: 'Enterprise Linux' },
        },
        {
          role: 'Application',
          name: 'PostgreSQL',
          version: '15.4',
          product: { vendor: 'PostgreSQL Global Development Group', name: 'PostgreSQL' },
        },
      ],
      criticality: 'High',
      owner: 'crm-ops@example.com',
      active: true,
    },
    {
      record_id: 'ND-004',
      name: 'core-switch-01',
      description: 'Switch de core del datacenter',
      kind: 'Network Device',
      hardware: { vendor: 'Cisco', model: 'Catalyst 9500' },
      software: [],
      criticality: 'High',
      owner: 'netops@example.com',
      active: true,
    },
    {
      record_id: 'VM-005',
      name: 'erp-app-02',
      description: 'Nodo de aplicación ERP',
      kind: 'Virtual Machine',
      hardware: null,
      software: [
        {
          role: 'Operating System',
          name: 'Windows Server',
          version: '2022',
          product: { vendor: 'Microsoft', name: 'Windows Server' },
        },
        {
          role: 'Application',
          name: 'SAP ERP',
          version: '6.0 EHP8',
          product: { vendor: 'SAP', name: 'ERP' },
        },
      ],
      criticality: 'Unknown',
      owner: null,
      active: false,
    },
  ],
}
