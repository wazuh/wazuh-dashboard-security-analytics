/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { History } from 'history';
import { SpaceSelector } from '../components/SpaceSelector/SpaceSelector';
import { useSpaceFilter } from './useSpaceFilter';
import { Space } from '../../types';

interface UseSpaceSelectorOptions {
  isDisabled?: boolean;
  isLoading?: boolean;
  documentationUrl?: string;
  onSpaceChange?: (spaceId: string) => void;
  /** Pass the caller's own `history` prop — see the comment on useSpaceFilter. */
  history?: History;
  /** URL params to clear in the same write as the space change (e.g. ['page']). */
  clearParamsOnChange?: string[];
}

export const useSpaceSelector = (
  options: UseSpaceSelectorOptions = {}
): {
  component: React.ReactComponentElement;
  spaceFilter: Space;
  setSpace: (id: string) => void;
} => {
  const { isDisabled, isLoading, documentationUrl, onSpaceChange, history, clearParamsOnChange } =
    options;
  const [spaceFilter, setSpaceFilter] = useSpaceFilter(history);
  const [isChanging, setIsChanging] = useState(false);
  const trackPending = isLoading !== undefined;
  const prevLoadingRef = useRef(!!isLoading);

  useEffect(() => {
    if (!trackPending) return;
    if (prevLoadingRef.current && !isLoading) {
      setIsChanging(false);
    }
    prevLoadingRef.current = !!isLoading;
  }, [isLoading, trackPending]);

  const handleSpaceChange = useCallback(
    (id: string) => {
      if (id === spaceFilter) return;
      if (trackPending) setIsChanging(true);
      // Wazuh: merge the space change and any caller-requested param clears (e.g.
      // resetting pagination) into ONE history write. OSD's ScopedHistory does not
      // synchronously reflect a `.replace()` call's effect on `history.location` for
      // a second `.replace()` fired later in the same tick, so two sequential
      // writes here would race — the second overwrites the first's change with its
      // own stale snapshot.
      setSpaceFilter(id, clearParamsOnChange);
      onSpaceChange?.(id);
    },
    [setSpaceFilter, onSpaceChange, spaceFilter, trackPending, clearParamsOnChange]
  );

  const component = (
    <SpaceSelector
      selectedSpace={spaceFilter}
      onSpaceChange={handleSpaceChange}
      isDisabled={isDisabled || isLoading || isChanging}
      documentationUrl={documentationUrl}
    />
  );

  // Wazuh: setSpace is handleSpaceChange, so callers outside the selector (an empty
  // state pointing at Standard) reuse its single history write.
  return { component, spaceFilter, setSpace: handleSpaceChange };
};
