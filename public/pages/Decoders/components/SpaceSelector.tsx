/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiCompressedFormRow,
  EuiCompressedSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';

interface SpaceSelectorProps {
  options: { value: string; text: string }[];
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
}

export const SpaceSelector: React.FC<SpaceSelectorProps> = ({
  options,
  value,
  onChange,
  isLoading = false,
}) => {
  return (
    <EuiCompressedFormRow fullWidth label="Space">
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EuiCompressedSelect
            options={options}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={isLoading}
            aria-label="Space selector"
          />
        </EuiFlexItem>
        {isLoading && (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiCompressedFormRow>
  );
};
