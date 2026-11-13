/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { IntegrationForm, IntegrationFormHandle } from './IntegrationForm';
import { defaultIntegration } from '../utils/constants';
import { IntegrationItem } from '../../../../types';
import { errorNotificationToast } from '../../../utils/helpers';

jest.mock('../../../utils/helpers', () => ({
  errorNotificationToast: jest.fn(),
  getIntegrationCategoryOptions: () => [{ value: 'endpoint', inputDisplay: 'Endpoint' }],
}));

const integrationWith = (id: string): IntegrationItem => ({
  ...defaultIntegration,
  id,
  detectionRulesCount: 0,
  decodersCount: 0,
  kvdbsCount: 0,
});

const submitEmptyForm = async (id: string) => {
  const ref = React.createRef<IntegrationFormHandle>();

  const wrapper = mount(
    <IntegrationForm
      ref={ref}
      integrationDetails={integrationWith(id)}
      // Wazuh: both the create and the edit flows render the form in edit mode.
      isEditMode={true}
      confirmButtonText="Create integration"
      notifications={{ toasts: { addDanger: jest.fn() } } as any}
      onCancel={jest.fn()}
      onConfirm={jest.fn()}
    />
  );

  await act(async () => {
    ref.current?.submit();
  });
  wrapper.unmount();
};

describe('<IntegrationForm /> validation toast', () => {
  it('names the create action when the integration has no id yet', async () => {
    await submitEmptyForm('');

    expect(errorNotificationToast).toHaveBeenCalledWith(
      expect.anything(),
      'create',
      'integration',
      'Fix the marked errors.'
    );
  });

  it('names the update action when an existing integration is edited', async () => {
    await submitEmptyForm('integration-1');

    expect(errorNotificationToast).toHaveBeenCalledWith(
      expect.anything(),
      'update',
      'integration',
      'Fix the marked errors.'
    );
  });
});

describe('<IntegrationForm /> field validation', () => {
  const mountForm = () => {
    const ref = React.createRef<IntegrationFormHandle>();
    const wrapper = mount(
      <IntegrationForm
        ref={ref}
        integrationDetails={integrationWith('')}
        isEditMode={true}
        confirmButtonText="Create integration"
        notifications={{ toasts: { addDanger: jest.fn() } } as any}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />
    );
    return { ref, wrapper };
  };

  const field = (wrapper: ReturnType<typeof mount>, testSubj: string) =>
    wrapper.find(`[data-test-subj="${testSubj}"]`).hostNodes();

  const errorTexts = (wrapper: ReturnType<typeof mount>) =>
    wrapper
      .find('.euiFormErrorText')
      .hostNodes()
      .map((node) => node.text());

  it('does not mark Category and Author while the user types the title', () => {
    const { wrapper } = mountForm();

    field(wrapper, 'integration_title_field').simulate('change', {
      target: { value: 'custom-integration' },
    });

    expect(errorTexts(wrapper)).toEqual([]);
  });

  it('marks the title only after the user leaves it', () => {
    const { wrapper } = mountForm();
    const title = () => field(wrapper, 'integration_title_field');

    title().simulate('change', { target: { value: 'a' } });
    expect(errorTexts(wrapper)).toEqual([]);

    title().simulate('blur');
    expect(errorTexts(wrapper)).toEqual(['Invalid title']);

    // Once marked, the error follows the value as the user keeps typing.
    title().simulate('change', { target: { value: 'ab' } });
    expect(errorTexts(wrapper)).toEqual([]);
  });

  it('marks the author when the user leaves it empty', () => {
    const { wrapper } = mountForm();

    field(wrapper, 'integration_author_field').simulate('blur');

    expect(errorTexts(wrapper)).toEqual(['Invalid author']);
  });

  it('marks the category when the user leaves it without choosing one', () => {
    const { wrapper } = mountForm();

    field(wrapper, 'integration_category_select').simulate('blur', { relatedTarget: null });

    expect(errorTexts(wrapper)).toEqual(['Select category to assign']);
  });

  it('does not mark the category while focus moves into its option list', () => {
    const { wrapper } = mountForm();
    const listbox = document.createElement('div');
    listbox.setAttribute('role', 'listbox');
    const option = document.createElement('button');
    listbox.appendChild(option);

    field(wrapper, 'integration_category_select').simulate('blur', { relatedTarget: option });

    expect(errorTexts(wrapper)).toEqual([]);
  });

  it('marks every invalid field once the user tries to submit', async () => {
    const { ref, wrapper } = mountForm();

    await act(async () => {
      ref.current?.submit();
    });
    wrapper.update();

    expect(errorTexts(wrapper)).toEqual([
      'Invalid title',
      'Select category to assign',
      'Invalid author',
    ]);
  });
});
