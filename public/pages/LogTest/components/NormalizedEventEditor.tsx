/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiCodeEditor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiToolTip,
} from '@elastic/eui';
import { LOG_TEST_HELP } from '../constants';

const EDITOR_OPTIONS = { tabSize: 2, useSoftTabs: true, showPrintMargin: false };

export interface NormalizedEventEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** The output of the last normalization test, offered as a starting point. */
  lastNormalizedOutput?: object | null;
  disabled?: boolean;
}

export const NormalizedEventEditor: React.FC<NormalizedEventEditorProps> = ({
  value,
  onChange,
  error,
  lastNormalizedOutput,
  disabled = false,
}) => (
  <EuiFormRow
    fullWidth
    isInvalid={!!error}
    error={error}
    helpText={LOG_TEST_HELP.normalizedEventHelp}
    label={
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>Normalized event</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={LOG_TEST_HELP.normalizedEvent}
            type="questionInCircle"
            color="subdued"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    }
    labelAppend={
      lastNormalizedOutput ? (
        <EuiToolTip content={LOG_TEST_HELP.useLastOutputTooltip}>
          <EuiButtonEmpty
            size="xs"
            flush="right"
            iconType="importAction"
            onClick={() => onChange(JSON.stringify(lastNormalizedOutput, null, 2))}
            isDisabled={disabled}
            data-test-subj="logTestUseLastNormalizedOutput"
          >
            {LOG_TEST_HELP.useLastOutput}
          </EuiButtonEmpty>
        </EuiToolTip>
      ) : undefined
    }
  >
    <EuiCodeEditor
      mode="json"
      width="100%"
      height="260px"
      value={value}
      onChange={onChange}
      setOptions={EDITOR_OPTIONS}
      isReadOnly={disabled}
      aria-label="Normalized event JSON editor"
      data-test-subj="logTestNormalizedEventEditor"
    />
  </EuiFormRow>
);
