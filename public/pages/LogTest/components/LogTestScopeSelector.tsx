/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiBadge,
  EuiCheckableCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormFieldset,
  EuiIconTip,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { LogTestScope } from '../../../../types';
import { LOG_TEST_HELP, LOG_TEST_SCOPE_OPTIONS } from '../constants';
import { LogTestScopeAvailability, describeUnavailableScopeReason } from '../utils';

export interface LogTestScopeSelectorProps {
  scope: LogTestScope;
  availability: LogTestScopeAvailability;
  space: string;
  onChange: (scope: LogTestScope) => void;
  disabled?: boolean;
}

export const LogTestScopeSelector: React.FC<LogTestScopeSelectorProps> = ({
  scope,
  availability,
  space,
  onChange,
  disabled = false,
}) => (
  <EuiFormFieldset
    legend={{
      children: (
        <span className="euiFormLabel">
          Test scope{' '}
          <EuiIconTip content={LOG_TEST_HELP.scope} type="questionInCircle" color="subdued" />
        </span>
      ),
    }}
    data-test-subj="logTestScopeSelector"
  >
    <EuiFlexGrid columns={3} gutterSize="s" responsive>
      {LOG_TEST_SCOPE_OPTIONS.map((option) => {
        const reason = availability[option.id];
        const card = (
          <EuiCheckableCard
            id={`logTestScope-${option.id}`}
            name="logTestScope"
            className="eui-fullHeight"
            label={<strong>{option.label}</strong>}
            checked={scope === option.id}
            // Wazuh: the selected card stays enabled even when it cannot run here, so the
            // user can still see which scope is chosen while the callout explains why.
            disabled={disabled || (!!reason && scope !== option.id)}
            onChange={() => onChange(option.id)}
            data-test-subj={`logTestScope-${option.id}`}
          >
            <EuiText size="xs" color="subdued">
              <p>{option.description}</p>
            </EuiText>
            {reason === 'no-root-decoder' && (
              <EuiBadge color="warning" style={{ marginTop: 6 }}>
                {LOG_TEST_HELP.needsRootDecoder}
              </EuiBadge>
            )}
          </EuiCheckableCard>
        );

        return (
          <EuiFlexItem key={option.id}>
            {reason ? (
              // Wazuh: a disabled card ignores pointer events, so the reason sits on a
              // wrapper that still receives them.
              <EuiToolTip
                content={describeUnavailableScopeReason(reason, space)}
                anchorClassName="eui-fullHeight"
              >
                {card}
              </EuiToolTip>
            ) : (
              card
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGrid>
  </EuiFormFieldset>
);
