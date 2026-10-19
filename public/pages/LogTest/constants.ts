/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { LogTestScope } from '../../../types';

export type MetadataFieldType = 'string' | 'number' | 'ip' | 'geo_point';

export interface LogTestMetadataFieldDef {
  key: string;
  type: MetadataFieldType;
}

export const METADATA_FIELDS: LogTestMetadataFieldDef[] = [
  { key: 'wazuh.agent.build.original', type: 'string' },
  { key: 'wazuh.agent.ephemeral_id', type: 'string' },
  { key: 'wazuh.agent.groups', type: 'string' },
  { key: 'wazuh.agent.host.architecture', type: 'string' },
  { key: 'wazuh.agent.host.boot.id', type: 'string' },
  { key: 'wazuh.agent.host.cpu.cores', type: 'number' },
  { key: 'wazuh.agent.host.cpu.name', type: 'string' },
  { key: 'wazuh.agent.host.cpu.speed', type: 'number' },
  { key: 'wazuh.agent.host.cpu.usage', type: 'number' },
  { key: 'wazuh.agent.host.disk.read.bytes', type: 'number' },
  { key: 'wazuh.agent.host.disk.write.bytes', type: 'number' },
  { key: 'wazuh.agent.host.domain', type: 'string' },
  { key: 'wazuh.agent.host.geo.city_name', type: 'string' },
  { key: 'wazuh.agent.host.geo.continent_code', type: 'string' },
  { key: 'wazuh.agent.host.geo.continent_name', type: 'string' },
  { key: 'wazuh.agent.host.geo.country_iso_code', type: 'string' },
  { key: 'wazuh.agent.host.geo.country_name', type: 'string' },
  { key: 'wazuh.agent.host.geo.location', type: 'geo_point' },
  { key: 'wazuh.agent.host.geo.name', type: 'string' },
  { key: 'wazuh.agent.host.geo.postal_code', type: 'string' },
  { key: 'wazuh.agent.host.geo.region_iso_code', type: 'string' },
  { key: 'wazuh.agent.host.geo.region_name', type: 'string' },
  { key: 'wazuh.agent.host.geo.timezone', type: 'string' },
  { key: 'wazuh.agent.host.hostname', type: 'string' },
  { key: 'wazuh.agent.host.id', type: 'string' },
  { key: 'wazuh.agent.host.ip', type: 'ip' },
  { key: 'wazuh.agent.host.mac', type: 'string' },
  { key: 'wazuh.agent.host.memory.free', type: 'number' },
  { key: 'wazuh.agent.host.memory.total', type: 'number' },
  { key: 'wazuh.agent.host.memory.used.percentage', type: 'number' },
  { key: 'wazuh.agent.host.name', type: 'string' },
  { key: 'wazuh.agent.host.network.egress.bytes', type: 'number' },
  { key: 'wazuh.agent.host.network.egress.drops', type: 'number' },
  { key: 'wazuh.agent.host.network.egress.errors', type: 'number' },
  { key: 'wazuh.agent.host.network.egress.packets', type: 'number' },
  { key: 'wazuh.agent.host.network.egress.queue', type: 'number' },
  { key: 'wazuh.agent.host.network.ingress.bytes', type: 'number' },
  { key: 'wazuh.agent.host.network.ingress.drops', type: 'number' },
  { key: 'wazuh.agent.host.network.ingress.errors', type: 'number' },
  { key: 'wazuh.agent.host.network.ingress.packets', type: 'number' },
  { key: 'wazuh.agent.host.network.ingress.queue', type: 'number' },
  { key: 'wazuh.agent.host.os.family', type: 'string' },
  { key: 'wazuh.agent.host.os.full', type: 'string' },
  { key: 'wazuh.agent.host.os.kernel', type: 'string' },
  { key: 'wazuh.agent.host.os.name', type: 'string' },
  { key: 'wazuh.agent.host.os.platform', type: 'string' },
  { key: 'wazuh.agent.host.os.type', type: 'string' },
  { key: 'wazuh.agent.host.os.version', type: 'string' },
  { key: 'wazuh.agent.host.pid_ns_ino', type: 'string' },
  { key: 'wazuh.agent.host.risk.calculated_level', type: 'string' },
  { key: 'wazuh.agent.host.risk.calculated_score', type: 'number' },
  { key: 'wazuh.agent.host.risk.calculated_score_norm', type: 'number' },
  { key: 'wazuh.agent.host.risk.static_level', type: 'string' },
  { key: 'wazuh.agent.host.risk.static_score', type: 'number' },
  { key: 'wazuh.agent.host.risk.static_score_norm', type: 'number' },
  { key: 'wazuh.agent.host.type', type: 'string' },
  { key: 'wazuh.agent.host.uptime', type: 'number' },
  { key: 'wazuh.agent.id', type: 'string' },
  { key: 'wazuh.agent.name', type: 'string' },
  { key: 'wazuh.agent.type', type: 'string' },
  { key: 'wazuh.agent.version', type: 'string' },
  { key: 'wazuh.cluster.name', type: 'string' },
  { key: 'wazuh.cluster.node', type: 'string' },
  { key: 'wazuh.protocol.location', type: 'string' },
  { key: 'wazuh.protocol.queue', type: 'number' },
  { key: 'wazuh.schema.version', type: 'string' },
];

// Wazuh: the three test scopes, in card order. The order is also the preference
// order when the page picks a default for the space.
export const LOG_TEST_SCOPE_OPTIONS: Array<{
  id: LogTestScope;
  label: string;
  description: string;
}> = [
  {
    id: 'full',
    label: 'Normalization and detection',
    description:
      "Decode a raw log with the space's decoders, then evaluate one integration's rules.",
  },
  {
    id: 'normalization',
    label: 'Normalization only',
    description: 'Decode a raw log and inspect the normalized fields. No rules are evaluated.',
  },
  {
    id: 'detection',
    label: 'Detection only',
    description:
      "Evaluate one integration's rules against a normalized event you provide. Works without decoders.",
  },
];

export const LOG_TEST_HELP = {
  scope:
    "Choose which part of the pipeline to run. Normalization uses the Engine and the space's decoders to turn a raw log into fields. Detection evaluates one integration's rules against those fields.",
  location:
    'Where the log was collected, as an agent reports it, for example /var/log/auth.log. Decoders can check this value.',
  traceLevel:
    "How much of the Engine's decoding path to return. Use All to see every decoder that was attempted.",
  integrationFull:
    "Its rules are evaluated against the normalized event. Decoding uses every decoder in the space, so the log can be decoded by another integration's decoders.",
  integrationDetection:
    'Its rules are evaluated against the normalized event below. Only integrations with at least one rule in this space can be selected.',
  logEvent: 'One raw log line, exactly as an agent would send it.',
  normalizedEvent:
    'A JSON object with the fields your rules check. Nested objects and dotted keys both work: {"event": {"outcome": "failure"}} is the same as {"event.outcome": "failure"}.',
  normalizedEventHelp: 'Values are matched case-sensitively, as a deployed detector matches them.',
  useLastOutput: 'Use last normalized output',
  useLastOutputTooltip:
    'Fill the editor with the output of your last normalization test in this session.',
  handoffText: 'Change fields and re-test rules without decoding the log again.',
  handoffButton: 'Test detection with this output',
  handoffTooltip: 'Switches to Detection only with this output in the editor.',
  needsRootDecoder: 'Needs a root decoder',
};
