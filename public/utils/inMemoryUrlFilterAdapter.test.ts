/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  buildQueryTextWithStatus,
  readInMemoryUrlFilterValues,
  splitStatusFromQueryText,
  writeInMemoryUrlFilterValues,
} from './inMemoryUrlFilterAdapter';

describe('splitStatusFromQueryText', () => {
  it('extracts the status token and leaves the remaining free text', () => {
    expect(splitStatusFromQueryText('aws status:enabled')).toEqual({
      query: 'aws',
      status: 'enabled',
    });
  });

  it('returns an empty status when no status token is present', () => {
    expect(splitStatusFromQueryText('aws')).toEqual({ query: 'aws', status: '' });
  });

  it('returns empty query/status for an empty string', () => {
    expect(splitStatusFromQueryText('')).toEqual({ query: '', status: '' });
  });

  it('supports a custom field name (e.g. "enabled" for Filters/Integrations)', () => {
    expect(splitStatusFromQueryText('aws enabled:true', 'enabled')).toEqual({
      query: 'aws',
      status: 'true',
    });
  });

  it('extracts a multiSelect "or" group without leaking it into the free text', () => {
    expect(splitStatusFromQueryText('status:(enabled or disabled) aws')).toEqual({
      query: 'aws',
      status: 'enabled,disabled',
    });
  });
});

describe('buildQueryTextWithStatus', () => {
  it('combines query and status into one text string', () => {
    expect(buildQueryTextWithStatus('aws', 'enabled')).toBe('aws status:enabled');
  });

  it('omits the status token when status is empty', () => {
    expect(buildQueryTextWithStatus('aws', '')).toBe('aws');
  });

  it('omits the query when it is empty', () => {
    expect(buildQueryTextWithStatus('', 'disabled')).toBe('status:disabled');
  });

  it('supports a custom field name', () => {
    expect(buildQueryTextWithStatus('aws', 'true', 'enabled')).toBe('aws enabled:true');
  });

  it('builds an "or" group from a comma-joined multi-value status', () => {
    expect(buildQueryTextWithStatus('aws', 'enabled,disabled')).toBe(
      'aws status:(enabled or disabled)'
    );
  });
});

describe('readInMemoryUrlFilterValues', () => {
  it('reads query and status from a search string', () => {
    expect(readInMemoryUrlFilterValues('?query=aws&status=enabled&space=standard')).toEqual({
      query: 'aws',
      status: 'enabled',
    });
  });

  it('defaults to empty strings when absent', () => {
    expect(readInMemoryUrlFilterValues('')).toEqual({ query: '', status: '' });
  });
});

describe('writeInMemoryUrlFilterValues', () => {
  it('writes only the patched keys and preserves other params like space', () => {
    const history = {
      location: { search: '?space=standard&status=enabled' },
      replace: jest.fn(),
    };

    writeInMemoryUrlFilterValues(history, { query: 'aws' });

    expect(history.replace).toHaveBeenCalledTimes(1);
    const arg = history.replace.mock.calls[0][0];
    const params = new URLSearchParams(arg.search);
    expect(params.get('query')).toBe('aws');
    expect(params.get('status')).toBe('enabled');
    expect(params.get('space')).toBe('standard');
  });

  it('deletes a param when its patched value is falsy', () => {
    const history = {
      location: { search: '?status=enabled' },
      replace: jest.fn(),
    };

    writeInMemoryUrlFilterValues(history, { status: '' });

    const arg = history.replace.mock.calls[0][0];
    const params = new URLSearchParams(arg.search);
    expect(params.has('status')).toBe(false);
  });
});
