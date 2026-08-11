/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// Wazuh: build a route that pre-selects an entity table's Integration filter with
// `integrationName` (exact match), used by the Integration column CTA menu to jump
// to another entity's list scoped to this integration. `space` carries the source
// row's space along so the target table lands there too, instead of falling back to
// whatever space was last visited (via useSpaceFilter's localStorage fallback).
export const buildEntityQueryRoute = (
  route: string,
  integrationName: string,
  space?: string
): string =>
  `${route}?integration=${encodeURIComponent(integrationName)}${
    space ? `&space=${encodeURIComponent(space)}` : ''
  }`;
