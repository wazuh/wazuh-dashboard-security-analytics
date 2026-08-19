/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { registerHelpMenu } from './helpMenu';
import { HOW_IT_WORKS_TITLE } from '../components/HowItWorksFlyout';

const chromeMock = () => ({ setHelpExtension: jest.fn() });

describe('registerHelpMenu', () => {
  it('registers a custom link that opens the flyout', () => {
    const chrome = chromeMock();

    registerHelpMenu(chrome as any);

    const extension = chrome.setHelpExtension.mock.calls[0][0];
    expect(extension.appName).toBe('Security Analytics');
    expect(extension.links).toHaveLength(1);
    expect(extension.links[0].linkType).toBe('custom');
    expect(extension.links[0].content).toBe(HOW_IT_WORKS_TITLE);
    expect(typeof extension.links[0].onClick).toBe('function');
  });

  it('clears the extension when the current registration unmounts', () => {
    const chrome = chromeMock();

    const unregister = registerHelpMenu(chrome as any);
    unregister();

    expect(chrome.setHelpExtension).toHaveBeenLastCalledWith(undefined);
  });

  it('does not clear a newer registration when a stale one unmounts', () => {
    const chrome = chromeMock();

    // renderApp runs per app mount, so navigating registers again before the previous
    // app unmounts.
    const unregisterFirst = registerHelpMenu(chrome as any);
    registerHelpMenu(chrome as any);
    chrome.setHelpExtension.mockClear();

    unregisterFirst();

    expect(chrome.setHelpExtension).not.toHaveBeenCalled();
  });
});
