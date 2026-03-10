/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  EuiCompressedComboBox,
  EuiCompressedFormRow,
  EuiCompressedSelect,
  EuiSpacer,
} from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
import {
  DetectorIntegrationSelection,
  DetectorIntegrationSpace,
} from '../../../types';
import FormFieldHeader from '../FormFieldHeader';
import { useDetectorIntegrationOptions } from './useDetectorIntegrationOptions';
import {
  DETECTOR_INTEGRATION_SPACE_OPTIONS,
  DetectorIntegrationOption,
} from './utils';

interface DetectorIntegrationSelectorProps {
  detectorType: string;
  integrationId?: string;
  integrationSpace: DetectorIntegrationSpace;
  enabled?: boolean;
  onSelectionChange: (selection: DetectorIntegrationSelection) => void;
}

export const DetectorIntegrationSelector: React.FC<DetectorIntegrationSelectorProps> = ({
  detectorType,
  integrationId,
  integrationSpace,
  enabled = true,
  onSelectionChange,
}) => {
  const [fieldTouched, setFieldTouched] = useState(false);
  const { loading, options } = useDetectorIntegrationOptions({
    integrationSpace,
    enabled,
  });

  const flatOptions: DetectorIntegrationOption[] = useMemo(() => {
    return options.flatMap((group) => group.options);
  }, [options]);

  useEffect(() => {
    if (!enabled || loading || !detectorType || integrationId) {
      return;
    }

    const matchedOption = flatOptions.find(
      (option) => option.value.toLowerCase() === detectorType.toLowerCase()
    );

    if (matchedOption) {
      onSelectionChange({
        detectorType: matchedOption.value,
        integrationId: matchedOption.id,
        integrationSpace,
      });
    }
  }, [
    detectorType,
    enabled,
    flatOptions,
    integrationId,
    integrationSpace,
    loading,
    onSelectionChange,
  ]);

  const selectedOption =
    flatOptions.find((option) => option.id === integrationId) ||
    flatOptions.find((option) => option.value.toLowerCase() === detectorType.toLowerCase());

  const errorMessage = !selectedOption && fieldTouched ? 'Select an integration.' : '';

  return (
    <>
      <EuiCompressedFormRow label={<FormFieldHeader headerTitle={'Space'} />} fullWidth={true}>
        <EuiCompressedSelect
          options={DETECTOR_INTEGRATION_SPACE_OPTIONS.map((option) => ({
            value: option.id,
            text: option.label,
          }))}
          value={integrationSpace}
          onChange={(event) => {
            setFieldTouched(true);
            onSelectionChange({
              detectorType: '',
              integrationId: undefined,
              integrationSpace: event.target.value as DetectorIntegrationSpace,
            });
          }}
          data-test-subj="detector-integration-space-select"
        />
      </EuiCompressedFormRow>

      <EuiSpacer />

      <EuiCompressedFormRow
        label={<FormFieldHeader headerTitle={'Integration'} />}
        fullWidth={true}
        isInvalid={!!errorMessage}
        error={errorMessage}
      >
        <EuiCompressedComboBox
          isInvalid={!!errorMessage}
          isLoading={loading}
          isDisabled={loading || !enabled}
          placeholder="Select integration"
          data-test-subj="log_type_dropdown"
          options={options}
          singleSelection={{ asPlainText: true }}
          onBlur={() => setFieldTouched(true)}
          onChange={(selectedOptions) => {
            setFieldTouched(true);
            const selectedOption = selectedOptions[0] as DetectorIntegrationOption | undefined;
            onSelectionChange({
              detectorType: selectedOption?.value || '',
              integrationId: selectedOption?.id,
              integrationSpace,
            });
          }}
          selectedOptions={selectedOption ? [selectedOption] : []}
        />
      </EuiCompressedFormRow>
    </>
  );
};
