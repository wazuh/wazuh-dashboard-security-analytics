/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import {
  useIntegrationDecoderGraph,
  UseIntegrationDecoderGraphParams,
  MAX_EXTERNAL_HOPS,
  MAX_EXTERNAL_DECODERS,
  MAX_GRAPH_DECODERS,
} from './useIntegrationDecoderGraph';

jest.mock('../../../store/DataStore', () => ({
  DataStore: {
    decoders: {
      searchDecoders: jest.fn(),
    },
    policies: {
      searchPolicies: jest.fn(),
    },
  },
}));

const { DataStore } = jest.requireMock('../../../store/DataStore');

const decoderItem = (name: string, id: string, parents?: string[]) => ({
  id,
  document: { id, name, metadata: { title: name }, parents },
});

const OWNED = decoderItem('decoder/wazuh-dashboard/0', 'wd-id', ['decoder/syslog/0']);
const SYSLOG = decoderItem('decoder/syslog/0', 'syslog-id', ['decoder/core-wazuh-message/0']);
const ROOT = decoderItem('decoder/core-wazuh-message/0', 'root-id', []);

/**
 * Serves `document.id` lookups from `owned` and `document.name` lookups from
 * `byName`, mirroring how the hook queries the two ends of a `parents`
 * relationship. Every registered external decoder is reachable regardless of
 * how many hops of BFS it takes to get there.
 */
const mockSearch = (owned: Array<ReturnType<typeof decoderItem>>, byName: Record<string, any>) => {
  DataStore.decoders.searchDecoders.mockImplementation(async (params: any) => {
    const filter = params.query.bool.filter[0].terms;
    if (filter['document.id']) {
      return { total: owned.length, items: owned };
    }
    const names: string[] = filter['document.name'];
    const items = names.map((name) => byName[name]).filter(Boolean);
    return { total: items.length, items };
  });
};

interface ProbeResult {
  loading: boolean;
  hierarchyTruncated: boolean;
  nodes: Array<{ id: string; decoderId?: string; role: string }>;
}

const HookProbe: React.FC<
  UseIntegrationDecoderGraphParams & { onResult: (r: ProbeResult) => void }
> = ({ onResult, ...params }) => {
  const { graph, loading, hierarchyTruncated } = useIntegrationDecoderGraph(params);
  onResult({
    loading,
    hierarchyTruncated,
    nodes: graph.nodes.map((node) => ({ id: node.id, decoderId: node.decoderId, role: node.role })),
  });
  return null;
};

const mountProbe = async (params: UseIntegrationDecoderGraphParams) => {
  let latest: ProbeResult = { loading: true, hierarchyTruncated: false, nodes: [] };
  await act(async () => {
    mount(<HookProbe {...params} onResult={(r) => (latest = r)} />);
  });
  return () => latest;
};

const mockRootDecoder = (rootDecoderId?: string) => {
  DataStore.policies.searchPolicies.mockResolvedValue(
    rootDecoderId ? { items: [{ document: { root_decoder: rootDecoderId } }] } : { items: [] }
  );
};

describe('useIntegrationDecoderGraph', () => {
  beforeEach(() => {
    DataStore.decoders.searchDecoders.mockReset();
    DataStore.policies.searchPolicies.mockReset();
    mockRootDecoder(undefined);
  });

  it('resolves an external parent chain more than one hop deep, and marks the root at the end of it', async () => {
    mockSearch([OWNED], {
      'decoder/syslog/0': SYSLOG,
      'decoder/core-wazuh-message/0': ROOT,
    });
    mockRootDecoder('root-id');

    const getResult = await mountProbe({
      decoderIds: ['wd-id'],
      space: 'default',
    });

    const { nodes } = getResult();
    const byId = (id: string) => nodes.find((node) => node.id === id);

    expect(nodes).toHaveLength(3);
    expect(byId('decoder/syslog/0')?.decoderId).toBe('syslog-id');
    expect(byId('decoder/core-wazuh-message/0')?.decoderId).toBe('root-id');
    expect(byId('decoder/core-wazuh-message/0')?.role).toBe('root');
    expect(getResult().hierarchyTruncated).toBe(false);
  });

  it('still resolves a directly-owned root at a single hop', async () => {
    mockSearch([OWNED], { 'decoder/syslog/0': SYSLOG });
    mockRootDecoder('syslog-id');

    const getResult = await mountProbe({
      decoderIds: ['wd-id'],
      space: 'default',
    });

    const { nodes } = getResult();
    expect(nodes.find((node) => node.id === 'decoder/syslog/0')?.role).toBe('root');
    expect(getResult().hierarchyTruncated).toBe(false);
  });

  it('leaves a parent that never resolves to a decoder without an id', async () => {
    mockSearch([OWNED], {});

    const getResult = await mountProbe({
      decoderIds: ['wd-id'],
      space: 'default',
    });

    const { nodes } = getResult();
    const missing = nodes.find((node) => node.id === 'decoder/syslog/0');
    expect(missing?.decoderId).toBeUndefined();
    expect(missing?.role).toBe('external');
    // Nothing left to resolve — the parent simply doesn't exist, so this
    // isn't the hop/size cap giving up with more chain still queued.
    expect(getResult().hierarchyTruncated).toBe(false);
  });

  it('stops resolving past the hop cap and reports the hierarchy as truncated', async () => {
    const CHAIN_LENGTH = 30;
    const levelName = (level: number) => `decoder/level-${level}/0`;
    const chain = Array.from({ length: CHAIN_LENGTH }, (_, index) => {
      const level = index + 1;
      const parents = level < CHAIN_LENGTH ? [levelName(level + 1)] : [];
      return decoderItem(levelName(level), `level-${level}-id`, parents);
    });
    const byName = Object.fromEntries(chain.map((item) => [item.document.name, item]));

    mockSearch([decoderItem('decoder/wazuh-dashboard/0', 'wd-id', [levelName(1)])], byName);

    const getResult = await mountProbe({
      decoderIds: ['wd-id'],
      space: 'default',
    });

    const nameCalls = DataStore.decoders.searchDecoders.mock.calls.filter(
      ([params]: [any]) => params.query.bool.filter[0].terms['document.name']
    );
    // Exactly MAX_EXTERNAL_HOPS expansion hops — nothing past the cap is ever searched for.
    expect(nameCalls).toHaveLength(MAX_EXTERNAL_HOPS);

    const { nodes } = getResult();
    // The first MAX_EXTERNAL_HOPS levels were resolved by normal expansion...
    expect(nodes.find((node) => node.id === levelName(MAX_EXTERNAL_HOPS))?.decoderId).toBe(
      `level-${MAX_EXTERNAL_HOPS}-id`
    );
    // ...but the very next one, one hop past the cap, was never searched for
    // at all — it doesn't appear in the graph, even though it's referenced
    // and genuinely exists — nor does anything further out.
    expect(nodes.find((node) => node.id === levelName(MAX_EXTERNAL_HOPS + 1))).toBeUndefined();
    expect(nodes.find((node) => node.id === levelName(MAX_EXTERNAL_HOPS + 2))).toBeUndefined();
    // The chain genuinely continues past what was resolved, so this is real truncation.
    expect(getResult().hierarchyTruncated).toBe(true);
  });

  it('fully resolves a chain that ends exactly at the hop cap, without truncation', async () => {
    const CHAIN_LENGTH = MAX_EXTERNAL_HOPS;
    const levelName = (level: number) => `decoder/level-${level}/0`;
    const chain = Array.from({ length: CHAIN_LENGTH }, (_, index) => {
      const level = index + 1;
      const parents = level < CHAIN_LENGTH ? [levelName(level + 1)] : [];
      return decoderItem(levelName(level), `level-${level}-id`, parents);
    });
    const byName = Object.fromEntries(chain.map((item) => [item.document.name, item]));

    mockSearch([decoderItem('decoder/wazuh-dashboard/0', 'wd-id', [levelName(1)])], byName);

    const getResult = await mountProbe({
      decoderIds: ['wd-id'],
      space: 'default',
    });

    const { nodes } = getResult();
    const last = nodes.find((node) => node.id === levelName(MAX_EXTERNAL_HOPS));
    expect(last?.decoderId).toBe(`level-${MAX_EXTERNAL_HOPS}-id`);
    expect(last?.role).toBe('external');
    // The chain has no further parents — it ends naturally right at the
    // boundary, so the hop-cap check itself has no off-by-one.
    expect(getResult().hierarchyTruncated).toBe(false);
  });

  it('gives external resolution its own budget, independent of how many decoders the integration owns', async () => {
    const ownedItems = Array.from({ length: MAX_GRAPH_DECODERS }, (_, index) =>
      decoderItem(
        `decoder/owned-${index}/0`,
        `owned-${index}-id`,
        index === 0 ? ['decoder/only-external/0'] : []
      )
    );
    const EXTERNAL = decoderItem('decoder/only-external/0', 'external-id', []);

    // Owned decoders are already at MAX_GRAPH_DECODERS — under the old,
    // combined check this alone would have left zero budget for external
    // resolution.
    mockSearch(ownedItems, { 'decoder/only-external/0': EXTERNAL });

    const getResult = await mountProbe({
      decoderIds: ownedItems.map((item) => item.id),
      space: 'default',
    });

    const { nodes } = getResult();
    expect(nodes.find((node) => node.id === 'decoder/only-external/0')?.decoderId).toBe(
      'external-id'
    );
    expect(getResult().hierarchyTruncated).toBe(false);
  });

  it('stops resolving once the external-decoder cap is reached and reports truncation', async () => {
    const EXTERNAL_COUNT = MAX_EXTERNAL_DECODERS + 1;
    const extName = (index: number) => `decoder/ext-${index}/0`;
    const grandName = (index: number) => `decoder/grand-${index}/0`;

    const externals = Array.from({ length: EXTERNAL_COUNT }, (_, index) =>
      decoderItem(extName(index), `ext-${index}-id`, [grandName(index)])
    );
    const grands = Array.from({ length: EXTERNAL_COUNT }, (_, index) =>
      decoderItem(grandName(index), `grand-${index}-id`, [])
    );
    const byName = Object.fromEntries(
      [...externals, ...grands].map((item) => [item.document.name, item])
    );
    const ownedParents = Array.from({ length: EXTERNAL_COUNT }, (_, index) => extName(index));

    mockSearch([decoderItem('decoder/wazuh-dashboard/0', 'wd-id', ownedParents)], byName);

    const getResult = await mountProbe({
      decoderIds: ['wd-id'],
      space: 'default',
    });

    const nameCalls = DataStore.decoders.searchDecoders.mock.calls.filter(
      ([params]: [any]) => params.query.bool.filter[0].terms['document.name']
    );
    // A single batch already resolves more externals than the cap allows —
    // it isn't trimmed mid-flight — but the cap is exceeded from it alone,
    // so no further hop ever fetches their own parents.
    expect(nameCalls).toHaveLength(1);

    const { nodes } = getResult();
    expect(nodes.find((node) => node.id === extName(0))?.decoderId).toBe('ext-0-id');
    expect(nodes.find((node) => node.id === grandName(0))).toBeUndefined();
    expect(getResult().hierarchyTruncated).toBe(true);
  });
});
