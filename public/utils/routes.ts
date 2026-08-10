/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// Wazuh: build a route that pre-selects an entity table's Integration filter with
// `integrationName` (exact match), used by the Integration column CTA menu to jump
// to another entity's list scoped to this integration.
export const buildEntityQueryRoute = (route: string, integrationName: string): string =>
  `${route}?integration=${encodeURIComponent(integrationName)}`;
