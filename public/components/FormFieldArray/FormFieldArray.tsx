/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  EuiSmallButton,
  EuiSmallButtonIcon,
  EuiCompressedFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCompressedFormRow,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import React, { ChangeEvent } from 'react';

export interface FormFieldArrayProps {
  label: string | React.ReactNode;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  readOnly?: boolean;
  addButtonLabel?: string;
}

export const FormFieldArray: React.FC<FormFieldArrayProps> = ({
  label,
  values,
  onChange,
  placeholder = '',
  readOnly = false,
  addButtonLabel = 'Add item',
}) => {
  const displayValues = values.length ? values : [''];

  return (
    <>
      <EuiCompressedFormRow label={label}>
        <>
          {displayValues.map((value: string, index: number) => {
            return (
              <EuiFlexGroup key={index} gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiCompressedFieldText
                    value={value}
                    placeholder={!readOnly ? placeholder : ''}
                    readOnly={readOnly}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      let newValues = [...displayValues];
                      newValues[index] = e.target.value;
                      onChange(newValues);
                    }}
                  />
                </EuiFlexItem>
                {displayValues.length > 1 && !readOnly ? (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip content={'Remove'}>
                      <EuiSmallButtonIcon
                        aria-label={'Remove'}
                        iconType={'trash'}
                        color="danger"
                        onClick={() => {
                          let newValues = [...displayValues];
                          newValues.splice(index, 1);
                          onChange(newValues);
                        }}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            );
          })}
          <EuiSpacer size="m" />
          {!readOnly && (
            <EuiSmallButton
              type="button"
              onClick={() => {
                onChange([...displayValues, '']);
              }}
            >
              {addButtonLabel}
            </EuiSmallButton>
          )}
        </>
      </EuiCompressedFormRow>
      <EuiSpacer />
    </>
  );
};
