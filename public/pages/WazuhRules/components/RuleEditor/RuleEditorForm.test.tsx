/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount, ReactWrapper } from 'enzyme';
import { EuiButtonGroup, EuiCodeEditor } from '@elastic/eui';
import { RuleEditorForm, VisualRuleEditorProps } from './RuleEditorForm';
import { YamlRuleEditorComponent } from './components/YamlRuleEditorComponent/YamlRuleEditorComponent';
import { ruleEditorStateDefaultValue } from './RuleEditorFormModel';
import { DataStore } from '../../../../store/DataStore';
import { mockContexts } from '../../../../../test/mocks/useContext.mock';
import { notificationsMock } from '../../../../../test/mocks/services';
import { setupCoreStart } from '../../../../../test/utils/helpers';

beforeAll(() => {
  setupCoreStart();
});

// `integration` is derived from logsource.product, so a rule without it would fail
// validation on that field and never reach submit.
const EDITED_RULE = [
  'level: high',
  'status: experimental',
  'logsource:',
  '  product: wazuh-core',
  'detection:',
  '  condition: selection',
  'metadata:',
  '  title: Edited rule',
].join('\n');

// A form that already validates, so the submit button is enabled. The flush only
// applies here: with an invalid form the button stays disabled through the whole
// debounce window and there is nothing to submit early.
const VALID_INITIAL_VALUE = {
  ...ruleEditorStateDefaultValue,
  integration: 'wazuh-core',
  level: 'high',
  status: 'experimental',
  detection: 'condition: selection\n',
  metadata: { ...ruleEditorStateDefaultValue.metadata, title: 'Original rule' },
};

const buildProps = (submit: jest.Mock): VisualRuleEditorProps => ({
  initialValue: VALID_INITIAL_VALUE,
  notifications: notificationsMock.NotificationsStart,
  submit,
  cancel: jest.fn(),
  mode: 'edit',
  title: 'title',
});

describe('<RuleEditorForm /> submit flush integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    DataStore.init(mockContexts.services as any, notificationsMock.NotificationsStart);
    jest.spyOn(DataStore.integrations, 'listIntegrationOptions').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const mountInYamlMode = async (submit: jest.Mock) => {
    let wrapper: ReactWrapper | undefined;

    await act(async () => {
      wrapper = mount(<RuleEditorForm {...buildProps(submit)} />);
    });
    wrapper!.update();

    act(() => {
      wrapper!.find(EuiButtonGroup).first().prop('onChange')('yaml', {} as any);
    });
    wrapper!.update();

    // Drive EuiCodeEditor through its onChange prop: `data-test-subj` lands on the
    // wrapper, and Ace's inner textarea is not reachable through enzyme in jsdom.
    // Scope to the YAML editor: the form renders other EuiCodeEditor instances and
    // `first()` would pick the wrong one.
    const editor = wrapper!.find(YamlRuleEditorComponent).find(EuiCodeEditor);
    expect(editor).toHaveLength(1);

    act(() => {
      (editor.prop('onChange') as (value: string) => void)(EDITED_RULE);
    });
    wrapper!.update();

    return wrapper!;
  };

  const clickSubmit = (wrapper: ReactWrapper) => {
    act(() => {
      wrapper.find('button[data-test-subj="submit_rule_form_button"]').first().simulate('click');
    });
  };

  it('submits the content in the editor without waiting for the debounce', async () => {
    // The 500 ms debounce is deliberately never advanced: only the flush can make
    // the edited content reach Formik in time. Without it the form submits
    // 'Original rule', the value from before the edit.
    const submit = jest.fn();
    const wrapper = await mountInYamlMode(submit);

    clickSubmit(wrapper);

    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    wrapper.update();

    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0].metadata.title).toBe('Edited rule');
  });

  it('applies the edited title, so no title error is shown', async () => {
    const submit = jest.fn();
    const wrapper = await mountInYamlMode(submit);

    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    wrapper.update();

    expect(wrapper.text()).not.toContain('A title under metadata is required');
  });
});
