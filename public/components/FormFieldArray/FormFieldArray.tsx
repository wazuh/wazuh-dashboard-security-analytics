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
import React, { ChangeEvent, useEffect, useState } from 'react';

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
  values: initialValues,
  onChange,
  placeholder = '',
  readOnly = false,
  addButtonLabel = 'Add item',
}) => {
  const [values, setValues] = useState<string[]>([]);

  useEffect(() => {
    let newValues = initialValues.length ? [...initialValues] : [''];
    setValues(newValues);
  }, []);

  const updateValues = (values: string[]) => {
    setValues(values);
    const eventValue = values.filter((val: string) => val.trim() !== '');
    onChange(eventValue);
  };

  return (
    <>
      <EuiCompressedFormRow label={label}>
        <>
          {values.map((value: string, index: number) => {
            return (
              <EuiFlexGroup key={index} gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiCompressedFieldText
                    value={value}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      let newValues = [...values];
                      newValues[index] = e.target.value;
                      updateValues(newValues);
                    }}
                  />
                </EuiFlexItem>
                {values.length > 1 && !readOnly ? (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip title={'Remove'}>
                      <EuiSmallButtonIcon
                        aria-label={'Remove'}
                        iconType={'trash'}
                        color="danger"
                        onClick={() => {
                          let newValues = [...values];
                          newValues.splice(index, 1);
                          updateValues(newValues);
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
                setValues([...values, '']);
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
