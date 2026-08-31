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
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { SPACE_SELECTOR_LABEL, SpaceTypes } from '../../../common/constants';
import { Space } from '../../../types';
import { HOW_IT_WORKS_TITLE, openHowItWorksFlyout } from '../HowItWorksFlyout/HowItWorksFlyout';

interface SpaceSelectorProps {
  selectedSpace: string;
  onSpaceChange: (spaceId: string) => void;
  isDisabled?: boolean;
  allowedSpaces?: string[];
  /**
   * Spaces that are listed but cannot be picked here, mapped to the reason why.
   * Named for the state, not for the rendering, because `disabledSpaces` already
   * means engine-disabled policies in the log test page.
   */
  unavailableSpaces?: Partial<Record<Space, string>>;
}

export const SpaceSelector: React.FC<SpaceSelectorProps> = ({
  selectedSpace,
  onSpaceChange,
  isDisabled = false,
  allowedSpaces,
  unavailableSpaces,
}) => {
  const visibleSpaceTypes = allowedSpaces
    ? Object.values(SpaceTypes).filter((st) => allowedSpaces.includes(st.value))
    : Object.values(SpaceTypes);
  const unavailableReasons: Partial<Record<Space, string>> = unavailableSpaces ?? {};
  const describedById = 'spaceSelectorUnavailableSpaces';
  const unavailableEntries = visibleSpaceTypes
    .filter((spaceType) => unavailableReasons[spaceType.value])
    .map((spaceType) => `${spaceType.label}: ${unavailableReasons[spaceType.value]}`);

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
          aria-describedby={unavailableEntries.length ? describedById : undefined}
          options={visibleSpaceTypes.map((spaceType) => {
            const reason = unavailableReasons[spaceType.value];
            return {
              id: spaceType.value,
              // The reason rides on the label: EuiButtonGroupOptionProps has no tooltip
              // prop, and the tooltip anchors on its own span, which still gets hover
              // even though the option renders as a disabled button.
              label: reason ? (
                <EuiToolTip content={reason}>
                  <span data-test-subj={`space-selector-option-${spaceType.value}`}>
                    {spaceType.label}
                  </span>
                </EuiToolTip>
              ) : (
                <span data-test-subj={`space-selector-option-${spaceType.value}`}>
                  {spaceType.label}
                </span>
              ),
              // Spread only when true: the option is applied after the group's own
              // isDisabled, so an explicit false would re-enable a disabled group.
              ...(reason ? { isDisabled: true } : {}),
            };
          })}
          idSelected={selectedSpace}
          onChange={onSpaceChange}
          isDisabled={isDisabled}
        />
        {unavailableEntries.length > 0 && (
          // A disabled option leaves the tab order, so the reason needs a path that
          // does not depend on hover.
          <EuiScreenReaderOnly>
            <p id={describedById}>{unavailableEntries.join('. ')}</p>
          </EuiScreenReaderOnly>
        )}
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
