/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { getApplication } from '../services/utils/constants';

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

// Wazuh: Decoders/Rules/KVDBs/Detectors/Integrations are separate registered
// OSD apps, each with its own history scoped to its own /app/<id> base path —
// history.push(route) from one app resolves relative to THAT app's scope
// instead of navigating to the target app. Build a real cross-app href
// instead (pair with RedirectAppLinks for SPA-style navigation on click).
export const buildAppUrl = (appId: string, route: string): string =>
  getApplication().getUrlForApp(appId, { path: `#${route}` });
