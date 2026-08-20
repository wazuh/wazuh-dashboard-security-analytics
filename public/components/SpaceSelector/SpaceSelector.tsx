/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { SPACE_SELECTOR_LABEL, SpaceTypes } from '../../../common/constants';
import { HOW_IT_WORKS_TITLE, openHowItWorksFlyout } from '../HowItWorksFlyout/HowItWorksFlyout';

interface SpaceSelectorProps {
  selectedSpace: string;
  onSpaceChange: (spaceId: string) => void;
  isDisabled?: boolean;
  allowedSpaces?: string[];
}

export const SpaceSelector: React.FC<SpaceSelectorProps> = ({
  selectedSpace,
  onSpaceChange,
  isDisabled = false,
  allowedSpaces,
}) => {
  const visibleSpaceTypes = allowedSpaces
    ? Object.values(SpaceTypes).filter((st) => allowedSpaces.includes(st.value))
    : Object.values(SpaceTypes);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText size="s" style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
          {SPACE_SELECTOR_LABEL}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          data-test-subj="space-selector"
          legend="Space selector"
          color="primary"
          options={visibleSpaceTypes.map((spaceType) => ({
            id: spaceType.value,
            label: spaceType.label,
          }))}
          idSelected={selectedSpace}
          onChange={onSpaceChange}
          isDisabled={isDisabled}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={HOW_IT_WORKS_TITLE}>
          <EuiButtonIcon
            iconType="iInCircle"
            aria-label={HOW_IT_WORKS_TITLE}
            onClick={openHowItWorksFlyout}
            color="primary"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
