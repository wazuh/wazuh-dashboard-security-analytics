/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { escapeWildcard, getBlockedSpaceActionReason, getBlockedSpaceLevelReason } from './helpers';
import { FiltersAllowedActionsBySpace, SPACE_ACTIONS } from './constants';

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

// Custom is reached through test, so a change made in draft is promoted twice.
const through = (space: string) => (space === 'custom' ? ' through the test space' : '');

describe('getBlockedSpaceActionReason', () => {
  it('returns undefined when the action is allowed', () => {
    expect(getBlockedSpaceActionReason('draft', SPACE_ACTIONS.DELETE, 'rules')).toBeUndefined();
    expect(getBlockedSpaceActionReason('draft', SPACE_ACTIONS.CREATE, 'rules')).toBeUndefined();
  });

  it.each(['test', 'custom'] as const)('explains the delete path through draft in %s', (space) => {
    expect(getBlockedSpaceActionReason(space, SPACE_ACTIONS.DELETE, 'rules')).toBe(
      `Rules in the ${space} space change only through promotion. To remove one, delete it in the draft space and promote the change${through(
        space
      )}.`
    );
  });

  it.each(['test', 'custom'] as const)('explains the create path through draft in %s', (space) => {
    expect(getBlockedSpaceActionReason(space, SPACE_ACTIONS.CREATE, 'KVDBs')).toBe(
      `KVDBs in the ${space} space change only through promotion. To add one, create it in the draft space and promote it${through(
        space
      )}.`
    );
  });

  it.each(['test', 'custom'] as const)('explains the edit path through draft in %s', (space) => {
    expect(getBlockedSpaceActionReason(space, SPACE_ACTIONS.EDIT, 'decoders')).toBe(
      `Decoders in the ${space} space change only through promotion. To change one, edit it in the draft space and promote the change${through(
        space
      )}.`
    );
  });

  it('honours a custom allowed-actions map', () => {
    expect(
      getBlockedSpaceActionReason(
        'standard',
        SPACE_ACTIONS.DELETE,
        'filters',
        FiltersAllowedActionsBySpace
      )
    ).toBeUndefined();
    expect(
      getBlockedSpaceActionReason(
        'test',
        SPACE_ACTIONS.EDIT,
        'filters',
        FiltersAllowedActionsBySpace
      )
    ).toBe(
      'Filters in the test space change only through promotion. To change one, edit it in the draft space and promote the change.'
    );
  });

  it('allows rearranging integrations in draft only', () => {
    expect(
      getBlockedSpaceActionReason('draft', SPACE_ACTIONS.REARRANGE_INTEGRATIONS, 'integrations')
    ).toBeUndefined();
  });

  it.each(['test', 'custom'] as const)(
    'explains the rearrange path through draft in %s',
    (space) => {
      expect(
        getBlockedSpaceActionReason(space, SPACE_ACTIONS.REARRANGE_INTEGRATIONS, 'integrations')
      ).toBe(
        `Integrations in the ${space} space change only through promotion. To change the order, rearrange them in the draft space and promote the change${through(
          space
        )}.`
      );
    }
  );

  it('keeps a plain, readable restriction for rearranging in standard', () => {
    expect(
      getBlockedSpaceActionReason('standard', SPACE_ACTIONS.REARRANGE_INTEGRATIONS, 'integrations')
    ).toBe('Cannot rearrange integrations in the standard space.');
  });

  it('explains the space policy edit path through draft in test and custom', () => {
    expect(getBlockedSpaceLevelReason('draft', SPACE_ACTIONS.EDIT_POLICY)).toBeUndefined();
    (['test', 'custom'] as const).forEach((space) => {
      expect(getBlockedSpaceLevelReason(space, SPACE_ACTIONS.EDIT_POLICY)).toBe(
        `The space policy of the ${space} space changes only through promotion. To change it, edit the policy in the draft space and promote the change${through(
          space
        )}.`
      );
    });
  });

  it('says only draft can be cleared, and that test and custom change through promotion', () => {
    expect(getBlockedSpaceLevelReason('draft', SPACE_ACTIONS.CLEAR_SPACE)).toBeUndefined();
    (['test', 'custom'] as const).forEach((space) => {
      expect(getBlockedSpaceLevelReason(space, SPACE_ACTIONS.CLEAR_SPACE)).toBe(
        `Only the draft space can be cleared. The ${space} space changes only through promotion.`
      );
    });
    expect(getBlockedSpaceLevelReason('standard', SPACE_ACTIONS.CLEAR_SPACE)).toBe(
      'Only the draft space can be cleared.'
    );
  });

  it('keeps a plain restriction in standard, which has no promotion path', () => {
    expect(getBlockedSpaceActionReason('standard', SPACE_ACTIONS.DELETE, 'decoders')).toBe(
      'Cannot delete decoders in the standard space.'
    );
    expect(getBlockedSpaceActionReason('standard', SPACE_ACTIONS.EDIT, 'decoders')).toBe(
      'Cannot edit decoders in the standard space.'
    );
    expect(getBlockedSpaceActionReason('standard', SPACE_ACTIONS.CREATE, 'decoders')).toBe(
      'Cannot create decoders in the standard space.'
    );
  });
});
