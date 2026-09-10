/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiCallOut,
  EuiCodeEditor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSmallButtonEmpty,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

export interface YamlSlotProps {
  /** Identifies the slot for test hooks and input ids. Not user-facing. */
  slotId: string;
  /** What this slot is called on screen. Defaults to `slotId`. */
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
 * A field in either of its two views, with an inline link to switch — the way the
 * rules detection editor offers its YAML escape. A decoder has several of these,
 * and a button group on each is what makes the form feel busy.
 *
 * The view is local state: it never reaches the form values.
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
  const [showYaml, setShowYaml] = useState(forced);
  const [draft, setDraft] = useState(yamlValue);
  const timerRef = useRef<number | null>(null);
  const isEditingRef = useRef(false);

  // Content can stop being representable mid-edit.
  useEffect(() => {
    if (forced) setShowYaml(true);
  }, [forced]);

  // Follow the document, but never while the user is typing.
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

  const name = label ?? slotId;

  return (
    <>
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

      {showYaml ? (
        <EuiCodeEditor
          mode="yaml"
          width="600px"
          height="180px"
          value={draft}
          onChange={onChange}
          setOptions={{ showLineNumbers: false, tabSize: 2 }}
          data-test-subj={`slot-yaml-${slotId}`}
        />
      ) : (
        children
      )}

      {!forced && (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup justifyContent="flexStart" gutterSize="none" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <EuiSmallButtonEmpty
                  flush="left"
                  onClick={() => setShowYaml(!showYaml)}
                  data-test-subj={`slot-toggle-${slotId}`}
                >
                  <EuiText size="xs">
                    {showYaml ? `Back to the form for ${name}` : `Edit ${name} as YAML`}
                  </EuiText>
                </EuiSmallButtonEmpty>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
