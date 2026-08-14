/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { History } from 'history';
import { SpaceTypes } from '../../common/constants';
import { Space } from '../../types';

const SPACE_FILTER_KEY = 'security_analytics_space_filter';

// Wazuh: `historyOverride` lets a caller pass the `history` object it already
// receives as a prop instead of relying on `useHistory()`/`useLocation()`, keeping
// this hook and a sibling `useUrlFilterParams(cfg, history)` call reading the same
// underlying router history rather than two separately-resolved instances.
export const useSpaceFilter = (historyOverride?: History) => {
  const routerLocation = useLocation();
  const routerHistory = useHistory();
  const history = historyOverride ?? routerHistory;
  const location = historyOverride ? historyOverride.location : routerLocation;

  const spaceFilter = useMemo(
    () =>
      new URLSearchParams(location.search).get('space') ||
      localStorage?.getItem(SPACE_FILTER_KEY) ||
      SpaceTypes.STANDARD.value,
    [location.search]
  );

  // Add space param to URL if missing
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has('space')) {
      params.set('space', spaceFilter);
      history.replace({ ...location, search: params.toString() });
    }
  }, [location.pathname]);

  // Persist to localStorage for cross-page navigation fallback
  useEffect(() => {
    localStorage?.setItem(SPACE_FILTER_KEY, spaceFilter);
  }, [spaceFilter]);

  // Wazuh: `clearParams` lets a caller fold e.g. a pagination reset into this SAME
  // history write. OSD's ScopedHistory does not synchronously reflect one
  // `.replace()` call's effect on `history.location` to a second `.replace()` fired
  // later in the same tick, so two sequential writes here would race — the second
  // would overwrite the first's change using its own stale snapshot.
  const setSpaceFilter = (id: string, clearParams: string[] = []) => {
    const params = new URLSearchParams(location.search);
    params.set('space', id);
    clearParams.forEach((name) => params.delete(name));
    history.replace({ ...location, search: params.toString() });
    localStorage?.setItem(SPACE_FILTER_KEY, id);
  };

  return [spaceFilter as Space, setSpaceFilter] as const;
};
