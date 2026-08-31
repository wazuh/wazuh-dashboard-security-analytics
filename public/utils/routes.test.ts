/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { buildEntityQueryRoute, getReturnTo, withReturnTo } from './routes';

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

  it('appends the space param when given, so the target table lands in the same space', () => {
    expect(buildEntityQueryRoute('/rules', 'aws', 'custom')).toBe(
      '/rules?integration=aws&space=custom'
    );
  });

  it('omits the space param when not given', () => {
    expect(buildEntityQueryRoute('/rules', 'aws')).toBe('/rules?integration=aws');
  });
});

describe('withReturnTo', () => {
  it('appends the return path to a route without a query', () => {
    expect(withReturnTo('/edit-rule/1', '/integrations/core')).toBe(
      '/edit-rule/1?returnTo=%2Fintegrations%2Fcore'
    );
  });

  it('keeps the params the route already carries', () => {
    expect(withReturnTo('/edit-decoder/1?space=draft', '/integrations/core?tab=decoders')).toBe(
      '/edit-decoder/1?space=draft&returnTo=%2Fintegrations%2Fcore%3Ftab%3Ddecoders'
    );
  });

  it('overwrites an existing return path instead of adding a second one', () => {
    expect(withReturnTo('/edit-rule/1?returnTo=%2Fold', '/new')).toBe(
      '/edit-rule/1?returnTo=%2Fnew'
    );
  });
});

describe('getReturnTo', () => {
  it('returns the in-app path carried by the query', () => {
    expect(getReturnTo('?returnTo=%2Fintegrations%2Fcore%3Ftab%3Dkvdbs', '/kvdbs')).toBe(
      '/integrations/core?tab=kvdbs'
    );
  });

  it('falls back to the given route when there is no return path', () => {
    expect(getReturnTo('', '/rules')).toBe('/rules');
    expect(getReturnTo('?space=draft', '/rules')).toBe('/rules');
  });

  it('rejects anything that could leave the app, so Save cannot become an open redirect', () => {
    expect(getReturnTo('?returnTo=https%3A%2F%2Fevil.test', '/rules')).toBe('/rules');
    expect(getReturnTo('?returnTo=%2F%2Fevil.test', '/rules')).toBe('/rules');
    expect(getReturnTo('?returnTo=evil.test', '/rules')).toBe('/rules');
    expect(getReturnTo('?returnTo=', '/rules')).toBe('/rules');
  });
});
