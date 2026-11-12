/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { escapeWildcard, getBlockedSpaceActionReason } from './helpers';
import { SPACE_ACTIONS } from './constants';

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

describe('getBlockedSpaceActionReason', () => {
  it('returns undefined when the action is allowed', () => {
    expect(getBlockedSpaceActionReason('draft', SPACE_ACTIONS.DELETE, 'rules')).toBeUndefined();
    expect(getBlockedSpaceActionReason('draft', SPACE_ACTIONS.CREATE, 'rules')).toBeUndefined();
  });

  it.each(['test', 'custom'] as const)('explains the delete path through draft in %s', (space) => {
    expect(getBlockedSpaceActionReason(space, SPACE_ACTIONS.DELETE, 'rules')).toBe(
      `Rules in the ${space} space change only through promotion. To remove one, delete it in the draft space and promote the change.`
    );
  });

  it.each(['test', 'custom'] as const)('explains the create path through draft in %s', (space) => {
    expect(getBlockedSpaceActionReason(space, SPACE_ACTIONS.CREATE, 'KVDBs')).toBe(
      `KVDBs in the ${space} space change only through promotion. To add one, create it in the draft space and promote it.`
    );
  });

  it('keeps a plain restriction in standard, which has no promotion path', () => {
    expect(getBlockedSpaceActionReason('standard', SPACE_ACTIONS.DELETE, 'decoders')).toBe(
      'Cannot delete decoders in the standard space.'
    );
    expect(getBlockedSpaceActionReason('standard', SPACE_ACTIONS.CREATE, 'decoders')).toBe(
      'Cannot create decoders in the standard space.'
    );
  });
});
