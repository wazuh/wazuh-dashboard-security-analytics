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

export const RETURN_TO_PARAM = 'returnTo';

// Wazuh: the rule/decoder/KVDB editors exit to their own list when the user saves or
// cancels. When one of them is opened from somewhere else — the Integration details
// tables — that page appends its own path as `returnTo`, and the editor exits there
// instead, so the user comes back to the tab they left.
export const withReturnTo = (route: string, returnTo: string): string => {
  const [path, query] = route.split('?');
  const params = new URLSearchParams(query);
  params.set(RETURN_TO_PARAM, returnTo);
  return `${path}?${params.toString()}`;
};

// Wazuh: `returnTo` travels in the URL, so it is untrusted input. Only an in-app
// absolute path is accepted ('/integrations/x'); anything that could leave the app
// ('//host', 'https://host', a bare 'evil') falls back to the editor's own list, so
// a crafted link cannot turn Save/Cancel into an open redirect.
export const getReturnTo = (search: string, fallback: string): string => {
  const returnTo = new URLSearchParams(search).get(RETURN_TO_PARAM);

  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return fallback;
  }

  return returnTo;
};
