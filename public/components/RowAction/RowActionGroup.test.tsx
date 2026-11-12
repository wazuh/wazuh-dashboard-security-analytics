/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RowActionGroup } from './RowActionGroup';

describe('RowActionGroup', () => {
  it('spaces every child after the first like OUI spaces sibling row actions', () => {
    const { getByText } = render(
      <RowActionGroup>
        <span>a</span>
        <span>b</span>
        <span>c</span>
      </RowActionGroup>
    );

    expect((getByText('a').parentElement as HTMLElement).style.marginLeft).toBe('');
    expect((getByText('b').parentElement as HTMLElement).style.marginLeft).toBe('8px');
    expect((getByText('c').parentElement as HTMLElement).style.marginLeft).toBe('8px');
  });
});
