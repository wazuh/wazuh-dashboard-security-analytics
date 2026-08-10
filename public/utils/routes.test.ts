/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { buildEntityQueryRoute } from './routes';

describe('buildEntityQueryRoute', () => {
  it('builds a route with the query text URL-encoded', () => {
    expect(buildEntityQueryRoute('/rules', 'aws')).toBe('/rules?query=aws');
  });

  it('encodes special characters in the query text', () => {
    expect(buildEntityQueryRoute('/decoders', 'a b&c')).toBe('/decoders?query=a%20b%26c');
  });

  it('returns the bare route with an empty query param when queryText is empty', () => {
    expect(buildEntityQueryRoute('/kvdbs', '')).toBe('/kvdbs?query=');
  });
});
