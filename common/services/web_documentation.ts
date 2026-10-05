/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { DOCUMENTATION_WEB_BASE_URL, PLUGIN_VERSION_SHORT } from '../constants';

/**
 * Generate a URL to the web documentation taking in account the plugin short version or
 * specified version.
 * @param urlPath Relative path to the base URL + version.
 * @param version version. Optional. It will use the plugin short version by default.
 */
export function webDocumentationLink(
  urlPath: string,
  version: string = PLUGIN_VERSION_SHORT
): string {
  return `${DOCUMENTATION_WEB_BASE_URL}/${version}/${urlPath}`;
}
