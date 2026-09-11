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
