/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { getFiltersTableColumns } from './helpers';

const getActions = (space: string) => {
  const column: any = getFiltersTableColumns(space, jest.fn(), jest.fn(), jest.fn()).find(
    (c: any) => c.name === 'Actions'
  );
  return column.actions as any[];
};

const blockedActions = (space: string) =>
  getActions(space).filter((a) => a.render && a.available());

// Custom is reached through test, so a change made in draft is promoted twice.
const through = (space: string) => (space === 'custom' ? ' through the test space' : '');

describe('getFiltersTableColumns row Edit and Delete actions by space', () => {
  it.each(['test', 'custom'])(
    'adds a disabled Edit and Delete with the promotion reason in %s',
    (space) => {
      const [edit, remove] = blockedActions(space).map((a) => a.render().props);

      expect(blockedActions(space).length).toBe(2);
      expect(edit.label).toBe('Edit');
      expect(edit.reason).toBe(
        `Filters in the ${space} space change only through promotion. To change one, edit it in the draft space and promote the change${through(
          space
        )}.`
      );
      expect(remove.label).toBe('Delete');
      expect(remove.reason).toBe(
        `Filters in the ${space} space change only through promotion. To remove one, delete it in the draft space and promote the change${through(
          space
        )}.`
      );
    }
  );

  it('shows no disabled actions in draft, where the regular ones apply', () => {
    expect(blockedActions('draft').length).toBe(0);
    const regular = getActions('draft').filter(
      (a) => a.onClick && (a.available ? a.available() : true)
    );
    expect(regular.map((a) => a.name)).toEqual(['View', 'Edit', 'Delete']);
  });

  it('shows no disabled actions in standard, which has no promotion path', () => {
    expect(blockedActions('standard').length).toBe(0);
  });
});
