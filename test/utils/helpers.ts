/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { navigationPluginMock } from '../../../../src/plugins/navigation/public/mocks';
import { applicationServiceMock } from '../../../../src/core/public/application/application_service.mock';
import { uiSettingsServiceMock } from '../../../../src/core/public/ui_settings/ui_settings_service.mock';
import {
  setApplication,
  setBreadCrumbsSetter,
  setNavigationUI,
  setUISettings,
} from '../../public/services/utils/constants';

export function setupCoreStart() {
  setNavigationUI(navigationPluginMock.createStartContract().ui);
  setApplication(applicationServiceMock.createStartContract());
  setUISettings(uiSettingsServiceMock.createStartContract());
  setBreadCrumbsSetter(jest.fn());
}

// Wazuh: a fake `history` whose `replace` notifies `listen` subscribers, so a
// same-route URL change reaches useUrlFilterParams the way OSD's ScopedHistory does.
export const createFakeHistory = (pathname: string, search: string) => {
  let location = { pathname, search, hash: '', state: undefined as any };
  const listeners: Array<(loc: typeof location) => void> = [];
  return {
    get location() {
      return location;
    },
    replace: jest.fn((next: { search: string }) => {
      location = { ...location, search: next.search };
      listeners.forEach((listener) => listener(location));
    }),
    push: jest.fn(),
    listen: jest.fn((listener: (loc: typeof location) => void) => {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    }),
  };
};
