/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { toIntegrationResourcePayload } from './helpers';
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
