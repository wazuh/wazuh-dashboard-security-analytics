/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from '@jest/globals';
import IntegrationService from './IntegrationService';

const buildHttpClient = () => {
  const post = jest.fn().mockResolvedValue({ ok: true, response: { hits: { hits: [] } } });
  return { post } as any;
};

describe('IntegrationService.searchIntegrations', () => {
  it('scopes an id lookup by document.id AND space, not the OpenSearch _id', async () => {
    const httpClient = buildHttpClient();
    const service = new IntegrationService(httpClient);

    await service.searchIntegrations({ id: 'aws', spaceFilter: 'custom' });

    const body = JSON.parse(httpClient.post.mock.calls[0][1].body);
    expect(body.query).toEqual({
      bool: {
        must: [{ term: { 'document.id': 'aws' } }, { term: { 'space.name': 'custom' } }],
      },
    });
  });

  it('falls back to a plain document.id term when no space is given', async () => {
    const httpClient = buildHttpClient();
    const service = new IntegrationService(httpClient);

    await service.searchIntegrations({ id: 'aws' });

    const body = JSON.parse(httpClient.post.mock.calls[0][1].body);
    expect(body.query).toEqual({ term: { 'document.id': 'aws' } });
  });

  it('searches by space alone when no id is given', async () => {
    const httpClient = buildHttpClient();
    const service = new IntegrationService(httpClient);

    await service.searchIntegrations({ spaceFilter: 'custom' });

    const body = JSON.parse(httpClient.post.mock.calls[0][1].body);
    expect(body.query).toEqual({
      bool: { must: { query_string: { query: 'space.name:custom' } } },
    });
  });
});
