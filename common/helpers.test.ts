/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { escapeWildcard } from './helpers';

describe('escapeWildcard', () => {
  it('keeps * live so the user can type a wildcard', () => {
    expect(escapeWildcard('apache*log')).toBe('apache*log');
  });

  it('escapes ? so it stays a literal', () => {
    expect(escapeWildcard('a?b')).toBe('a\\?b');
  });

  it('escapes a backslash so it cannot start an escape sequence', () => {
    expect(escapeWildcard('a\\b')).toBe('a\\\\b');
  });

  it('leaves text without special characters untouched', () => {
    expect(escapeWildcard('windows-defender')).toBe('windows-defender');
  });
});
