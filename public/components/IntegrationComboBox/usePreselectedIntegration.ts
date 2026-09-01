/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useEffect, useRef } from 'react';
import { IntegrationOption } from './useIntegrationSelector';

export const INTEGRATION_PARAM = 'integration';

interface UsePreselectedIntegrationParams {
  /** The location search string the form was opened with (e.g. '?integration=syslog'). */
  search?: string;
  options: IntegrationOption[];
  isLoading: boolean;
  enabled?: boolean;
  /** Called once with the integration named by the query param, when one matches. */
  onPreselect: (option: IntegrationOption) => void;
}

/**
 * The create forms for decoders, rules and KVDBs are reachable from a given
 * integration (its details page actions and empty states), which appends
 * `?integration=<name>` — the same param the entity lists already filter by. Fill the
 * form's Integration field in from it so the user does not have to pick again what the
 * origin already knew. The value stays editable, and an unknown name is ignored: the
 * selector just stays empty, as it does when the param is absent.
 */
export function usePreselectedIntegration({
  search,
  options,
  isLoading,
  enabled = true,
  onPreselect,
}: UsePreselectedIntegrationParams) {
  // Only ever seed the field once: after that the value belongs to the user, so a
  // later options refresh (creating an integration from the flyout) must not undo it.
  const preselected = useRef(false);

  useEffect(() => {
    if (!enabled || preselected.current || isLoading || !options.length) return;

    const integration = new URLSearchParams(search).get(INTEGRATION_PARAM);
    if (!integration) return;

    const match = options.find((o) => o.value === integration || o.id === integration);
    preselected.current = true;

    if (match) {
      onPreselect(match);
    }
  }, [enabled, isLoading, options, search, onPreselect]);
}
