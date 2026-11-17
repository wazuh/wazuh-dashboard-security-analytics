/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount } from 'enzyme';
import { ParseExpressionErrorToast } from './ParseExpressionErrorToast';

const error = {
  reason: 'Expected end of input',
  position: 4,
  expression: '<a> \\ <b>',
  location: { field: 'event.original', expressionIndex: 0 },
};
const details = 'Main error: Expected end of input at 4\n<a> \\ <b>\n----^\n\nList of errors:\n…';

const find = (wrapper: ReturnType<typeof mount>, testSubj: string) =>
  wrapper.find(`[data-test-subj="${testSubj}"]`).hostNodes();

describe('<ParseExpressionErrorToast />', () => {
  it('names the expression and marks the failing position', () => {
    const wrapper = mount(<ParseExpressionErrorToast error={error} details={details} />);

    expect(find(wrapper, 'parseExpressionErrorSummary').text()).toBe(
      'Parsers > event.original, expression 1: expected end of input at position 4, found "\\"'
    );
    expect(find(wrapper, 'parseExpressionErrorPosition').text()).toContain('<a> \\ <b>\n    ^');
  });

  it('keeps the engine trace behind Show details', () => {
    const wrapper = mount(<ParseExpressionErrorToast error={error} details={details} />);
    const toggle = () => find(wrapper, 'parseExpressionErrorDetailsToggle');

    expect(find(wrapper, 'parseExpressionErrorDetails').exists()).toBe(false);
    expect(toggle().text()).toMatch(/Show details$/);

    toggle().simulate('click');
    expect(find(wrapper, 'parseExpressionErrorDetails').text()).toContain('List of errors:');
    expect(toggle().text()).toMatch(/Hide details$/);

    toggle().simulate('click');
    expect(find(wrapper, 'parseExpressionErrorDetails').exists()).toBe(false);
  });
});
