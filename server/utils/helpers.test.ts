/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { toIntegrationResourcePayload, escapeWildcard, mergeIdsClause } from './helpers';
import { IntegrationBase } from '../../types';

describe('toIntegrationResourcePayload', () => {
  const baseDocument: IntegrationBase['document'] = {
    id: 'integration-id',
    category: 'other',
    mode: 'user-managed',
    metadata: { title: 'my-integration', author: 'Wazuh' } as any,
  };

  it('renames enabled to user_enabled when enabled is true', () => {
    const resource = toIntegrationResourcePayload({ ...baseDocument, enabled: true });

    expect(resource).toEqual({
      id: 'integration-id',
      category: 'other',
      mode: 'user-managed',
      metadata: { title: 'my-integration', author: 'Wazuh' },
      user_enabled: true,
    });
    expect(resource).not.toHaveProperty('enabled');
  });

  it('renames enabled to user_enabled when enabled is false', () => {
    const resource = toIntegrationResourcePayload({ ...baseDocument, enabled: false });

    expect(resource.user_enabled).toBe(false);
    expect(resource).not.toHaveProperty('enabled');
  });

  it('leaves the rest of the document untouched, in every space', () => {
    ['standard', 'draft', 'test', 'custom'].forEach((spaceName) => {
      const document = {
        ...baseDocument,
        enabled: true,
        decoders: ['decoder-a'],
        kvdbs: ['kvdb-a'],
        rules: ['rule-a'],
        tags: { correlation_id: 1 },
      };

      const resource = toIntegrationResourcePayload(document);

      expect(resource).toMatchObject({
        id: 'integration-id',
        category: 'other',
        mode: 'user-managed',
        decoders: ['decoder-a'],
        kvdbs: ['kvdb-a'],
        rules: ['rule-a'],
        tags: { correlation_id: 1 },
        user_enabled: true,
      });
    });
  });
});

describe('escapeWildcard', () => {
  it('escapes * and ? so they are treated as literals', () => {
    expect(escapeWildcard('a*b?c')).toBe('a\\*b\\?c');
  });

  it('leaves strings without wildcard characters untouched', () => {
    expect(escapeWildcard('windows-defender')).toBe('windows-defender');
  });
});

describe('mergeIdsClause', () => {
  it('returns the original query unchanged when there are no ids to merge', () => {
    const query = { match_all: {} };
    expect(mergeIdsClause(query, 'document.id', [])).toBe(query);
  });

  it('wraps a match_all query into a should clause with the ids', () => {
    const result = mergeIdsClause({ match_all: {} }, 'document.id', ['rule-1', 'rule-2']);
    expect(result).toEqual({
      bool: {
        should: [{ terms: { 'document.id': ['rule-1', 'rule-2'] } }],
        minimum_should_match: 1,
      },
    });
  });

  it('ORs the ids clause into an existing bool/should query', () => {
    const query = {
      bool: {
        should: [{ wildcard: { 'document.metadata.title': { value: '*win*' } } }],
        minimum_should_match: 1,
      },
    };

    const result: any = mergeIdsClause(query, 'document.id', ['rule-1']);

    expect(result.bool.should).toEqual([
      { wildcard: { 'document.metadata.title': { value: '*win*' } } },
      { terms: { 'document.id': ['rule-1'] } },
    ]);
    expect(result.bool.minimum_should_match).toBe(1);
  });

  it('wraps a non-bool query alongside the ids clause', () => {
    const query = { match_phrase: { 'document.metadata.description': 'foo' } };

    const result = mergeIdsClause(query, 'document.id', ['rule-1']);

    expect(result).toEqual({
      bool: {
        should: [query, { terms: { 'document.id': ['rule-1'] } }],
        minimum_should_match: 1,
      },
    });
  });
});
