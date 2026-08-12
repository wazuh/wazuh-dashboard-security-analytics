/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { buildStatusIntegrationFilters } from './entitySearchBarFilters';
import { IntegrationOption } from '../components/IntegrationComboBox/useIntegrationSelector';

describe('buildStatusIntegrationFilters', () => {
  const integrationOptions: IntegrationOption[] = [
    { value: 'aws', label: 'AWS' } as IntegrationOption,
    { value: 'azure', label: 'Azure' } as IntegrationOption,
  ];

  it('produces byte-for-byte identical output to the pre-parameterization implementation when called without overrides (Rules/Decoders/KVDBs call sites)', () => {
    expect(buildStatusIntegrationFilters(integrationOptions, false)).toEqual([
      {
        type: 'field_value_selection',
        field: 'status',
        name: 'Status',
        compressed: true,
        multiSelect: 'or',
        operator: 'exact',
        options: [
          { value: 'enabled', name: 'Enabled' },
          { value: 'disabled', name: 'Disabled' },
        ],
      },
      {
        type: 'field_value_selection',
        field: 'integration',
        name: 'Integration',
        compressed: true,
        multiSelect: 'or',
        operator: 'exact',
        loading: false,
        options: [
          { value: 'aws', name: 'AWS' },
          { value: 'azure', name: 'Azure' },
        ],
      },
    ]);
  });

  it('propagates the loading flag unchanged', () => {
    const filters = buildStatusIntegrationFilters(integrationOptions, true);
    expect(filters[1].loading).toBe(true);
  });

  it('honors overrides: custom integration field and explicit integration options supersede integrationOptions', () => {
    const filters = buildStatusIntegrationFilters([], false, {
      integrationField: 'logType',
      integrationFilterOptions: [{ value: 'windows', name: 'Windows' }],
    });

    expect(filters[1]).toMatchObject({
      field: 'logType',
      name: 'Integration',
      options: [{ value: 'windows', name: 'Windows' }],
      multiSelect: 'or',
      operator: 'exact',
      compressed: true,
    });
  });

  it('honors a custom statusOptions override without leaking the default Enabled/Disabled pair', () => {
    const filters = buildStatusIntegrationFilters([], false, {
      statusOptions: [
        { value: 'active', name: 'Active' },
        { value: 'inactive', name: 'Inactive' },
      ],
    });

    expect(filters[0].options).toEqual([
      { value: 'active', name: 'Active' },
      { value: 'inactive', name: 'Inactive' },
    ]);
  });
});
