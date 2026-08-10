/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// Wazuh: build a route that pre-fills an entity table's search box with `queryText`,
// used by the Integration column CTA menu to jump to another entity's list.
export const buildEntityQueryRoute = (route: string, queryText: string): string =>
  `${route}?query=${encodeURIComponent(queryText)}`;
