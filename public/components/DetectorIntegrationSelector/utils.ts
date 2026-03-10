/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { startCase } from 'lodash';
import { SpaceTypes } from '../../../common/constants';
import { DetectorIntegrationSpace, Integration } from '../../../types';
import { getIntegrationLabel } from '../../pages/Integrations/utils/helpers';
import { integrationCategories } from '../../utils/constants';

export interface DetectorIntegrationOption {
  id: string;
  label: string;
  value: string;
  category: string;
  space: DetectorIntegrationSpace;
}

export interface DetectorIntegrationOptionGroup {
  label: string;
  options: DetectorIntegrationOption[];
}

export const DETECTOR_INTEGRATION_SPACE_OPTIONS: Array<{
  id: DetectorIntegrationSpace;
  label: string;
}> = [
  {
    id: SpaceTypes.STANDARD.value,
    label: SpaceTypes.STANDARD.label,
  },
  {
    id: SpaceTypes.CUSTOM.value,
    label: SpaceTypes.CUSTOM.label,
  },
];

const getCategoryLabel = (category: string) =>
  integrationCategories.find(({ value }) => value === category)?.label ?? startCase(category);

const mapIntegrationToOption = (
  integration: Integration,
  space: DetectorIntegrationSpace
): DetectorIntegrationOption => ({
  id: integration.id,
  label: getIntegrationLabel(integration.document.title),
  value: integration.document.title,
  category: integration.document.category,
  space,
});

export const mapDetectorIntegrationsToOptionGroups = (
  integrations: Integration[],
  space: DetectorIntegrationSpace
): DetectorIntegrationOptionGroup[] => {
  const integrationsByCategory = integrations.reduce<Record<string, DetectorIntegrationOption[]>>(
    (acc, integration) => {
      const option = mapIntegrationToOption(integration, space);
      acc[option.category] = acc[option.category] || [];
      acc[option.category].push(option);
      return acc;
    },
    {}
  );

  return Object.entries(integrationsByCategory)
    .sort(([categoryA], [categoryB]) => {
      return getCategoryLabel(categoryA).localeCompare(getCategoryLabel(categoryB));
    })
    .map(([category, options]) => ({
      label: getCategoryLabel(category),
      options: options.sort((optionA, optionB) => optionA.label.localeCompare(optionB.label)),
    }));
};
