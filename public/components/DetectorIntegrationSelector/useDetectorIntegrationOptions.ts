/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useEffect, useState } from 'react';
import { DetectorIntegrationSpace } from '../../../types';
import { DataStore } from '../../store/DataStore';
import {
  DetectorIntegrationOptionGroup,
  mapDetectorIntegrationsToOptionGroups,
} from './utils';

interface UseDetectorIntegrationOptionsParams {
  integrationSpace: DetectorIntegrationSpace;
  enabled?: boolean;
}

export const useDetectorIntegrationOptions = ({
  integrationSpace,
  enabled = true,
}: UseDetectorIntegrationOptionsParams) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<DetectorIntegrationOptionGroup[]>([]);

  useEffect(() => {
    if (!enabled || !DataStore.integrations) {
      setLoading(false);
      setOptions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    DataStore.integrations
      .getDetectorIntegrations(integrationSpace)
      .then((integrations) => {
        if (!cancelled) {
          setOptions(mapDetectorIntegrationsToOptionGroups(integrations, integrationSpace));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, integrationSpace]);

  return { loading, options };
};
