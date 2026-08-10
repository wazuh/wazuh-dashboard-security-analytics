/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { buildEntityQueryRoute } from './routes';

describe('buildEntityQueryRoute', () => {
  it('builds a route with the integration name URL-encoded', () => {
    expect(buildEntityQueryRoute('/rules', 'aws')).toBe('/rules?integration=aws');
  });

  it('encodes special characters in the integration name', () => {
    expect(buildEntityQueryRoute('/decoders', 'a b&c')).toBe('/decoders?integration=a%20b%26c');
  });

  it('returns the bare route with an empty integration param when the name is empty', () => {
    expect(buildEntityQueryRoute('/kvdbs', '')).toBe('/kvdbs?integration=');
  });
});
