/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { mount } from 'enzyme';
import { RowAction } from './RowAction';

describe('RowAction', () => {
  it('is enabled and calls onClick when there is no disabled reason', () => {
    const onClick = jest.fn();
    const { getByLabelText } = render(
      <RowAction name="Delete" iconType="trash" description="Delete rule" onClick={onClick} />
    );

    const button = getByLabelText('Delete');
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and does not call onClick when a reason is given', () => {
    const onClick = jest.fn();
    const { getByLabelText } = render(
      <RowAction
        name="Delete"
        iconType="trash"
        description="Delete rule"
        disabledReason="Delete it in the draft space and promote the change."
        onClick={onClick}
      />
    );

    const button = getByLabelText('Delete');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('uses the disabled reason as the tooltip, and the description when enabled', () => {
    const reason = 'Delete it in the draft space and promote the change.';
    const disabled = mount(
      <RowAction
        name="Delete"
        iconType="trash"
        description="Delete rule"
        disabledReason={reason}
        onClick={jest.fn()}
      />
    );
    expect(disabled.find('EuiToolTip').prop('content')).toBe(reason);

    const enabled = mount(
      <RowAction name="Delete" iconType="trash" description="Delete rule" onClick={jest.fn()} />
    );
    expect(enabled.find('EuiToolTip').prop('content')).toBe('Delete rule');
  });
});
