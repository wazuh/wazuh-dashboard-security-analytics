/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiComboBoxOptionOption,
  EuiCompressedComboBox,
  EuiCompressedFormRow,
  EuiTextColor,
} from '@elastic/eui';
import { DataStore } from '../../../../../store/DataStore';
import { buildDecodersSearchQuery } from '../../../utils/constants';

const SEARCH_DELAY_MS = 300;
const SEARCH_SIZE = 25;

/** The option label is the decoder name, which is what `parents` stores. */
type ParentOption = EuiComboBoxOptionOption<string> & { title?: string };

/**
 * The name goes first: the list is as narrow as the field, and the name is what
 * the decoder stores. The title follows to help recognise it.
 */
const renderParentOption = (option: ParentOption) => (
  <span>
    {option.label}
    {option.title && <EuiTextColor color="subdued">{` ${option.title}`}</EuiTextColor>}
  </span>
);

export interface ParentsComboBoxProps {
  label: React.ReactNode;
  values: string[];
  onChange: (values: string[]) => void;
  /** Space whose decoders are offered. */
  space?: string;
  /** Name of the decoder being edited, which cannot be its own parent. */
  ownName?: string;
  helpText?: React.ReactNode;
}

/**
 * Parents picked from the decoders of the space. A typed name is kept too, so a
 * parent the search does not return can still be entered.
 */
export const ParentsComboBox: React.FC<ParentsComboBoxProps> = ({
  label,
  values,
  onChange,
  space,
  ownName,
  helpText,
}) => {
  const [options, setOptions] = useState<ParentOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // The search starts on first focus, so a form that is only read makes no request.
  const [search, setSearch] = useState<string | undefined>(undefined);
  const latestSearch = useRef(0);

  useEffect(() => {
    if (search === undefined) return;
    const seq = ++latestSearch.current;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      const response = await DataStore.decoders.searchDecoders(
        {
          from: 0,
          size: SEARCH_SIZE,
          sort: [{ 'document.name': { order: 'asc', unmapped_type: 'keyword' } }],
          query: buildDecodersSearchQuery(search),
          _source: { includes: ['document.name', 'document.metadata.title'] },
        },
        space,
        // A failed search leaves typing a name, so it is not worth a toast.
        { silent: true }
      );
      if (seq !== latestSearch.current) return;
      setOptions(
        (response.items ?? [])
          .map((item) => ({
            label: item?.document?.name ?? '',
            title: item?.document?.metadata?.title,
          }))
          .filter((option) => option.label && option.label !== ownName)
      );
      setIsLoading(false);
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [search, space, ownName]);

  const onFocus = useCallback(() => setSearch((current) => current ?? ''), []);

  const onCreateOption = useCallback(
    (typed: string) => {
      const name = typed.trim();
      if (name && !values.includes(name)) onChange([...values, name]);
    },
    [values, onChange]
  );

  return (
    <EuiCompressedFormRow label={label} helpText={helpText} fullWidth={true}>
      <EuiCompressedComboBox
        async
        placeholder="Search decoders or type a name"
        options={options}
        selectedOptions={values.map((value) => ({ label: value }))}
        onChange={(selected) => onChange(selected.map((option) => option.label))}
        onCreateOption={onCreateOption}
        onSearchChange={setSearch}
        onFocus={onFocus}
        isLoading={isLoading}
        renderOption={renderParentOption}
        data-test-subj="parents"
      />
    </EuiCompressedFormRow>
  );
};
