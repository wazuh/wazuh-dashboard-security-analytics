/*
 * PROTOTYPE — throwaway. Mock data for the UX-review prototype.
 * Names, titles and rule levels are copied from the live 5.0.0 content
 * (wazuh-threatintel-* indices) so density and copy read realistically.
 */

export type StageId = 'draft' | 'test' | 'custom' | 'standard';

export interface StageInfo {
  id: StageId;
  label: string;
  /** One line describing what the stage *is*, for tooltips and rail copy. */
  meaning: string;
  /** Short state line shown inside the stage control. */
  state: string;
  /** 'ready' | 'blocked' | 'active' | 'reference' — drives the dot colour. */
  health: 'ready' | 'blocked' | 'active' | 'reference';
  pending: number;
}

export const PIPELINE: StageInfo[] = [
  {
    id: 'draft',
    label: 'Draft',
    meaning: 'Author and edit. Not loaded into the engine.',
    state: '3 changes pending',
    health: 'ready',
    pending: 3,
  },
  {
    id: 'test',
    label: 'Test',
    meaning: 'Loaded in the engine. Validate with Log test.',
    state: 'policy disabled',
    health: 'blocked',
    pending: 0,
  },
  {
    id: 'custom',
    label: 'Custom',
    meaning: 'Active on all incoming events.',
    state: '12 active',
    health: 'active',
    pending: 0,
  },
];

export const REFERENCE_STAGE: StageInfo = {
  id: 'standard',
  label: 'Standard',
  meaning: 'Built-in content shipped by Wazuh. Read-only.',
  state: '125 integrations',
  health: 'reference',
  pending: 0,
};

export const ALL_STAGES: StageInfo[] = [...PIPELINE, REFERENCE_STAGE];

export const stageById = (id: StageId): StageInfo =>
  ALL_STAGES.find((s) => s.id === id) ?? PIPELINE[0];

/* ---------------------------------------------------------------- Overview */

export interface Blocker {
  id: string;
  tone: 'warning' | 'primary';
  title: string;
  body: string;
  actionLabel: string;
  /** Screen the action navigates to, when it navigates at all. */
  goTo?: 'promote' | 'decoders';
}

export const BLOCKERS: Blocker[] = [
  {
    id: 'policy',
    tone: 'warning',
    title: 'Test space policy is disabled',
    body:
      'Content promoted to Test will not be loaded into the engine until the policy is enabled.',
    actionLabel: 'Enable policy',
  },
  {
    id: 'root-decoder',
    tone: 'warning',
    title: 'Draft has no root decoder',
    body: 'A root decoder is required before Draft can be promoted to Test.',
    actionLabel: 'Assign root decoder',
  },
  {
    id: 'pending',
    tone: 'primary',
    title: '3 changes ready to promote from Draft',
    body: '1 integration, 1 decoder and 1 rule have changes that are not yet in Test.',
    actionLabel: 'Review changes',
    goTo: 'promote',
  },
];

export const COVERAGE = {
  activeDetectors: 8,
  rulesInCustom: 34,
  silentDetectors: 2,
  eventsLast24h: 41892,
};

export const GETTING_STARTED = [
  {
    icon: 'package',
    title: 'Create an integration',
    body: 'An integration groups the decoders, rules and KVDBs that make one log source work.',
    action: 'Create integration',
  },
  {
    icon: 'indexEdit',
    title: 'Add a decoder',
    body: 'A decoder turns a raw log line into normalized fields.',
    action: 'Create decoder',
  },
  {
    icon: 'inspect',
    title: 'Test a log event',
    body: 'Paste a real log line and see which decoder matches and which fields it produces.',
    action: 'Open Log test',
  },
];

/* ---------------------------------------------------------------- Decoders */

export interface DecoderRow {
  id: string;
  name: string;
  title: string;
  integration: string;
  author: string;
  enabled: boolean;
  lastTested?: string;
}

const STANDARD_SEED: Array<[string, string, string]> = [
  [
    'amazon-security-lake-application-activity',
    'Amazon Security Lake Application Activity Decoder',
    'aws-amazon-security-lake',
  ],
  [
    'amazon-security-lake-discovery',
    'Amazon Security Lake Discovery Decoder',
    'aws-amazon-security-lake',
  ],
  [
    'amazon-security-lake-findings',
    'Amazon Security Lake Findings Decoder',
    'aws-amazon-security-lake',
  ],
  ['amazon-security-lake-iam', 'Amazon Security Lake IAM Decoder', 'aws-amazon-security-lake'],
  [
    'amazon-security-lake-network',
    'Amazon Security Lake Network Activity Decoder',
    'aws-amazon-security-lake',
  ],
  [
    'amazon-security-lake-system-activity',
    'Amazon Security Lake System Activity Decoder',
    'aws-amazon-security-lake',
  ],
  ['amazon-security-lake', 'Amazon Security Lake Base Decoder', 'aws-amazon-security-lake'],
  ['anthropic-audit', 'Anthropic Console audit log decoder', 'anthropic'],
  ['apache-access', 'Apache HTTP Server access logs decoder', 'apache'],
  ['apache-error', 'Apache HTTP Server error logs decoder', 'apache'],
  ['apache-tomcat-access', 'Apache Tomcat access logs decoder', 'apache-tomcat'],
  ['apache-tomcat-catalina-localhost', 'Apache Tomcat Catalina and Localhost', 'apache-tomcat'],
  ['auditd', 'Linux audit system logs decoder', 'auditd'],
  ['aws-apigateway-logs', 'AWS API Gateway logs decoder', 'aws'],
  ['aws-bedrock-invocation', 'AWS Bedrock Model Invocation Log Decoder', 'aws-bedrock'],
  ['aws-cloudfront-logs', 'AWS CloudFront Logs decoder', 'aws'],
  ['aws-cloudtrail', 'AWS CloudTrail logs decoder', 'aws'],
  ['aws-cloudwatch', 'AWS CloudWatch logs decoder', 'aws'],
  ['aws-ec2-logs', 'AWS EC2 logs decoder', 'aws'],
  ['aws-elb-logs', 'AWS ELB logs decoder', 'aws'],
  ['aws-fargate-firelens', 'AWS Fargate FireLens Logs Decoder', 'aws-fargate'],
  ['aws-firehose-metrics', 'AWS Firehose Metrics Decoder', 'aws'],
  ['aws-firehose', 'AWS Firehose Logs Decoder', 'aws'],
  ['aws-firewall-logs', 'AWS Network Firewall JSON logs decoder', 'aws'],
  ['aws-guardduty', 'AWS GuardDuty Findings JSON logs decoder', 'aws'],
  ['aws-inspector', 'AWS Inspector Findings JSON decoder', 'aws'],
  ['aws-route53-public-logs', 'AWS Route53 Public Query Logs decoder', 'aws'],
  ['aws-route53-resolver-logs', 'AWS Route53 Resolver Query Logs JSON decoder', 'aws'],
  ['azure-functions', 'Azure Functions logs decoder', 'azure-functions'],
  [
    'azure-network-watcher-nsg',
    'Azure Network Watcher NSG flow logs decoder',
    'azure-network-watcher-nsg',
  ],
  ['cisco-aironet', 'Cisco Aironet logs decoder', 'cisco-aironet'],
  ['cisco-nexus', 'Cisco Nexus logs decoder', 'cisco-nexus'],
  ['haproxy', 'HAProxy logs decoder', 'haproxy'],
  ['iis', 'Microsoft IIS logs decoder', 'iis'],
  ['iptables', 'Netfilter iptables logs decoder', 'iptables'],
  ['system-auth', 'Linux authentication logs decoder', 'system-auth'],
];

export const STANDARD_DECODERS: DecoderRow[] = STANDARD_SEED.map(
  ([name, title, integration], i) => ({
    id: `std-${i}`,
    name: `decoder/${name}/0`,
    title,
    integration,
    author: 'Wazuh, Inc.',
    enabled: true,
  })
);

export const CUSTOM_DECODERS: DecoderRow[] = [
  {
    id: 'cus-1',
    name: 'decoder/custom-ssh-auth/0',
    title: 'Custom SSH Auth Decoder',
    integration: 'custom-ssh-auth',
    author: 'Security Team',
    enabled: true,
    lastTested: 'passed · 2 h ago',
  },
  {
    id: 'cus-2',
    name: 'decoder/access-management/0',
    title: 'Access Management Decoder',
    integration: 'access-management',
    author: 'Security Team',
    enabled: true,
    lastTested: 'passed · yesterday',
  },
  {
    id: 'cus-3',
    name: 'decoder/legacy-vpn/0',
    title: 'Legacy VPN Concentrator Decoder',
    integration: 'legacy-vpn',
    author: 'Security Team',
    enabled: false,
    lastTested: 'never tested',
  },
];

export const TEST_DECODERS: DecoderRow[] = [
  {
    id: 'tst-1',
    name: 'decoder/custom-ssh-auth/0',
    title: 'Custom SSH Auth Decoder',
    integration: 'custom-ssh-auth',
    author: 'Security Team',
    enabled: true,
    lastTested: 'passed · 20 min ago',
  },
];

export const decodersForStage = (stage: StageId): DecoderRow[] => {
  switch (stage) {
    case 'standard':
      return STANDARD_DECODERS;
    case 'custom':
      return CUSTOM_DECODERS;
    case 'test':
      return TEST_DECODERS;
    default:
      return [];
  }
};

/** Total in the space, of which the table holds one page-set (fidelity of scale). */
export const decoderTotalForStage = (stage: StageId): number =>
  stage === 'standard' ? 505 : decodersForStage(stage).length;

/* ---------------------------------------------------------------- Promote */

export type Operation = 'add' | 'update' | 'remove';

export interface ChangeEntity {
  id: string;
  name: string;
  kind: 'space policy' | 'integration' | 'decoder' | 'rule' | 'kvdb';
  operation: Operation;
  added: number;
  removed: number;
  /** Absent for adds — nothing to diff against. */
  before?: string;
  after?: string;
  /** Entities this one drags along if selected. */
  requires?: string[];
}

export const CHANGE_SET: ChangeEntity[] = [
  {
    id: 'policy',
    name: 'Custom space · space policy',
    kind: 'space policy',
    operation: 'update',
    added: 1,
    removed: 1,
    before: 'root_decoder: decoder/core-wazuh-message/0\nenabled: false\n',
    after: 'root_decoder: decoder/custom-ssh-auth/0\nenabled: true\n',
  },
  {
    id: 'integration',
    name: 'custom-ssh-auth · integration',
    kind: 'integration',
    operation: 'add',
    added: 12,
    removed: 0,
    after:
      'name: custom-ssh-auth\ntitle: Custom SSH authentication\nauthor: Security Team\ndecoders:\n  - decoder/custom-ssh-auth/0\nrules:\n  - rule/ssh-failed-password/0\n',
  },
  {
    id: 'decoder',
    name: 'decoder/custom-ssh-auth/0',
    kind: 'decoder',
    operation: 'update',
    added: 4,
    removed: 1,
    before:
      'normalize:\n  - map:\n      - "@timestamp": get_date()\n      - message: $event.original\n',
    after:
      'normalize:\n  - map:\n      - "@timestamp": parse_date($event.start, "%b %d %H:%M:%S")\n      - source.ip: $ssh.client_ip\n      - event.action: authentication_failed\n      - message: $event.original\n',
    requires: ['integration'],
  },
  {
    id: 'rule',
    name: 'SSH Failed Password Detection · rule',
    kind: 'rule',
    operation: 'add',
    added: 18,
    removed: 0,
    after:
      'name: rule/ssh-failed-password/0\nlevel: medium\ncheck:\n  - event.action: authentication_failed\n  - source.ip: exists()\nmitre:\n  - T1110\n',
    requires: ['integration'],
  },
];

export const PREFLIGHT = [
  { id: 'policy', label: 'Draft space policy enabled', ok: true },
  { id: 'root', label: 'Root decoder decoder/custom-ssh-auth/0', ok: true },
  { id: 'schema', label: 'All selected entities pass schema validation', ok: true },
  { id: 'tested', label: '1 selected entity has never been tested', ok: false },
];

/* ---------------------------------------------------------------- Log test */

export interface FieldRow {
  field: string;
  value: string;
  origin: 'decoder' | 'enrichment' | 'raw event';
}

export const SAMPLE_EVENTS: Record<string, string> = {
  'system-auth':
    'Dec 19 12:00:00 myhost sshd[1234]: Failed password for root from 10.0.0.1 port 12345 ssh2',
  apache: '10.0.0.8 - - [19/Dec/2026:12:00:04 +0000] "GET /admin HTTP/1.1" 403 199',
};

export const PARSED_FIELDS: FieldRow[] = [
  { field: 'event.action', value: 'authentication-failure', origin: 'decoder' },
  { field: 'event.dataset', value: 'system-auth', origin: 'decoder' },
  { field: 'event.outcome', value: 'failure', origin: 'decoder' },
  { field: 'process.name', value: 'sshd', origin: 'decoder' },
  { field: 'process.pid', value: '1234', origin: 'decoder' },
  { field: 'related.user', value: 'root', origin: 'decoder' },
  { field: 'related.ip', value: '10.0.0.1', origin: 'decoder' },
  { field: 'source.ip', value: '10.0.0.1', origin: 'decoder' },
  { field: 'source.port', value: '12345', origin: 'decoder' },
  { field: 'host.hostname', value: 'myhost', origin: 'decoder' },
  { field: 'wazuh.integration.name', value: 'system-auth', origin: 'enrichment' },
  { field: 'wazuh.cluster.name', value: 'wazuh-cluster', origin: 'enrichment' },
  {
    field: 'event.original',
    value:
      'Dec 19 12:00:00 myhost sshd[1234]: Failed password for root from 10.0.0.1 port 12345 ssh2',
    origin: 'raw event',
  },
];

export const MATCHED_RULES = [
  {
    name: 'SSH brute force attempt - {{source.ip}}',
    cleanName: 'SSH brute force attempt',
    level: 'medium',
    technique: 'T1110 · Brute Force',
  },
];

export const EVALUATED_RULES = [
  'Authentication failure on privileged account',
  'SSH brute force attempt',
  'Login from unusual location',
  'Password spraying across hosts',
];

export const RAW_RESPONSE = `{
  "status": "OK",
  "output": {
    "@timestamp": "2026-12-19T12:00:00.000Z",
    "event": { "action": "authentication-failure", "dataset": "system-auth", "outcome": "failure" },
    "process": { "name": "sshd", "pid": 1234 },
    "related": { "user": "root", "ip": "10.0.0.1" },
    "source": { "ip": "10.0.0.1", "port": 12345 },
    "host": { "hostname": "myhost" },
    "wazuh": { "integration": { "name": "system-auth", "decoders": ["decoder/system-auth/0"] } }
  },
  "traces": [
    "[decoder/system-auth/0] check: SUCCESS",
    "[decoder/system-auth/0] parse.logpar: SUCCESS -> process.name, process.pid",
    "[decoder/core-wazuh-message/0] check: SUCCESS"
  ]
}`;

export const TRACE_LINES = [
  {
    decoder: 'decoder/core-wazuh-message/0',
    step: 'check',
    outcome: 'success' as const,
    detail: 'event.original exists',
  },
  {
    decoder: 'decoder/system-auth/0',
    step: 'check',
    outcome: 'success' as const,
    detail: 'matched sshd pattern',
  },
  {
    decoder: 'decoder/system-auth/0',
    step: 'parse.logpar',
    outcome: 'success' as const,
    detail: '10 fields mapped',
  },
  {
    decoder: 'decoder/system-auth-json/0',
    step: 'check',
    outcome: 'failure' as const,
    detail: 'event.original is not JSON',
  },
];

export interface RunRecord {
  id: number;
  at: string;
  summary: string;
  outcome: 'parsed' | 'unmatched' | 'error';
}

export const SEED_RUNS: RunRecord[] = [
  { id: 3, at: '12:04', summary: '12 fields · 1 rule matched', outcome: 'parsed' },
  { id: 2, at: '12:01', summary: 'no decoder matched', outcome: 'unmatched' },
  { id: 1, at: '11:58', summary: '11 fields · 0 rules matched', outcome: 'parsed' },
];
