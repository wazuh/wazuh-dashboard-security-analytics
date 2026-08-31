/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount } from 'enzyme';
import { IntegrationEditAction } from './IntegrationEditAction';

const mountAction = (canEdit: boolean, onClick = jest.fn()) => ({
  onClick,
  wrapper: mount(
    <IntegrationEditAction
      entityLabel="KVDB"
      canEdit={canEdit}
      onClick={onClick}
      data-test-subj="edit-action"
    />
  ),
});

const tooltipOf = (wrapper: any) => wrapper.find('EuiToolTip').first().prop('content');

describe('<IntegrationEditAction />', () => {
  it('is clickable and labelled when editing is allowed', () => {
    const { wrapper, onClick } = mountAction(true);
    const button = wrapper.find('button[data-test-subj="edit-action"]').first();

    expect(button.prop('disabled')).toBe(false);
    expect(tooltipOf(wrapper)).toBe('Edit KVDB');

    button.simulate('click');
    expect(onClick).toHaveBeenCalled();
  });

  it('stays visible but disabled elsewhere, and says where editing is allowed', () => {
    const { wrapper, onClick } = mountAction(false);
    const button = wrapper.find('button[data-test-subj="edit-action"]').first();

    expect(button.prop('disabled')).toBe(true);
    // The acronym keeps its case, and the reason names the spaces that do allow it.
    expect(tooltipOf(wrapper)).toBe('KVDB can only be edited in the spaces: draft');

    button.simulate('click');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('capitalizes only the first letter of a plain entity name', () => {
    const { wrapper } = mountAction(false);
    wrapper.setProps({ entityLabel: 'decoder' });

    expect(tooltipOf(wrapper)).toBe('Decoder can only be edited in the spaces: draft');
  });
});
