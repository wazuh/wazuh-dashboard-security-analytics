/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { CoreStart } from 'opensearch-dashboards/public';
import { HOW_IT_WORKS_TITLE, openHowItWorksFlyout } from '../components/HowItWorksFlyout';

// Wazuh: `content` is not usable here. It mounts inside the help popover panel, so a
// flyout opened from it would unmount with the popover. A `custom` link spreads its
// props onto the button, so onClick reaches us and the flyout lives in our own tree.
//
// setHelpExtension is a single global slot. Core plugins set it on mount and never clear
// it; we clear ours so the section does not outlive the module. Restoring whatever was
// there before would re-show our own section on the way out, since a second app mount
// reads our own extension as the previous one. renderApp runs on every app mount, so the
// token guard keeps a stale unmount from clearing a newer registration.
let currentToken = 0;

export function registerHelpMenu(chrome: CoreStart['chrome']): () => void {
  const token = ++currentToken;

  chrome.setHelpExtension({
    appName: 'Security Analytics',
    links: [
      {
        linkType: 'custom',
        content: HOW_IT_WORKS_TITLE,
        iconType: 'questionInCircle',
        // The platform does not dismiss the help popover for custom links, so send an
        // Escape from the button, which bubbles to the popover panel, before opening.
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          event.currentTarget.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
          );
          openHowItWorksFlyout();
        },
      },
    ],
  });

  return () => {
    if (token === currentToken) {
      chrome.setHelpExtension(undefined);
    }
  };
}
