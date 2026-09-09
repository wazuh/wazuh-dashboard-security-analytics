/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiButtonGroup, EuiCallOut, EuiCodeEditor, EuiSpacer } from '@elastic/eui';

export const SLOT_VIEW = {
  STRUCTURED: 'structured',
  YAML: 'yaml',
} as const;

export type SlotView = typeof SLOT_VIEW[keyof typeof SLOT_VIEW];

export interface YamlSlotProps {
  /** Identifies the slot for test hooks and input ids. Not user-facing. */
  slotId: string;
  /**
   * What this slot is called on screen, used for the toggle's accessible legend.
   * Defaults to `slotId`, which is only acceptable when the two are the same.
   */
  label?: string;
  /** Rendered when the slot is showing its structured view. */
  children: React.ReactNode;
  /** The slot's content as YAML text. */
  yamlValue: string;
  onYamlChange: (value: string) => void;
  /**
   * Why the structured view is unavailable, or undefined when it is available.
   * Set when the document holds a shape this editor does not model — the slot then
   * stays in YAML so nothing is lost.
   */
  structuredUnavailableReason?: string;
  /** A parse or validation error to show above the editor. */
  error?: string;
  /** Debounce before an edit is reported, matching YamlForm. */
  parseDebounceMs?: number;
}

/**
 * One editable region of the decoder, in either of its two views.
 *
 * Every slot has both a structured view and a YAML view, and content the structured
 * view cannot model simply *starts* in the YAML one — that is what makes the escape
 * hatch a property of every slot rather than a page-level trapdoor, and it is what
 * keeps an unrenderable `normalize` entry in its original position.
 *
 * The view itself is local state: it is a way of looking at the document, not part
 * of it, so it never reaches the form values.
 */
export const YamlSlot: React.FC<YamlSlotProps> = ({
  slotId,
  label,
  children,
  yamlValue,
  onYamlChange,
  structuredUnavailableReason,
  error,
  parseDebounceMs = 400,
}) => {
  const forced = Boolean(structuredUnavailableReason);
  const [view, setView] = useState<SlotView>(forced ? SLOT_VIEW.YAML : SLOT_VIEW.STRUCTURED);
  const [draft, setDraft] = useState(yamlValue);
  const timerRef = useRef<number | null>(null);
  const isEditingRef = useRef(false);

  // Content can stop being representable while the user edits it, in which case the
  // slot has to fall back rather than render a structured view of something it
  // cannot model.
  useEffect(() => {
    if (forced) setView(SLOT_VIEW.YAML);
  }, [forced]);

  // Track the document from outside, but never yank text out from under the cursor.
  useEffect(() => {
    if (isEditingRef.current) return;
    setDraft(yamlValue);
  }, [yamlValue]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  const onChange = useCallback(
    (value: string) => {
      isEditingRef.current = true;
      setDraft(value);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        isEditingRef.current = false;
        onYamlChange(value);
      }, parseDebounceMs);
    },
    [onYamlChange, parseDebounceMs]
  );

  const options = [
    {
      id: SLOT_VIEW.STRUCTURED,
      label: 'Visual Editor',
      isDisabled: forced,
      // EuiButtonGroup has no tooltip slot, so the reason rides on the title.
      title: structuredUnavailableReason,
    },
    { id: SLOT_VIEW.YAML, label: 'YAML Editor' },
  ];

  return (
    <>
      <EuiButtonGroup
        buttonSize="compressed"
        legend={`Editor type for ${label ?? slotId}`}
        data-test-subj={`slot-editor-type-${slotId}`}
        options={options}
        idSelected={view}
        onChange={(id) => setView(id as SlotView)}
      />
      <EuiSpacer size="s" />

      {forced && (
        <>
          <EuiCallOut
            size="s"
            color="warning"
            title={structuredUnavailableReason}
            data-test-subj={`slot-unavailable-${slotId}`}
          />
          <EuiSpacer size="s" />
        </>
      )}

      {error && (
        <>
          <EuiCallOut
            size="s"
            color="danger"
            title={error}
            data-test-subj={`slot-error-${slotId}`}
          />
          <EuiSpacer size="s" />
        </>
      )}

      {view === SLOT_VIEW.STRUCTURED ? (
        children
      ) : (
        <EuiCodeEditor
          mode="yaml"
          width="600px"
          height="180px"
          value={draft}
          onChange={onChange}
          setOptions={{ showLineNumbers: false, tabSize: 2 }}
          data-test-subj={`slot-yaml-${slotId}`}
        />
      )}
    </>
  );
};
