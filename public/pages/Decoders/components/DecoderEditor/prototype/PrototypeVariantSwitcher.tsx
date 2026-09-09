/*
 * PROTOTYPE — throwaway. See ./README.md
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';

export interface PrototypeVariantSwitcherProps {
  variants: Array<{ key: string; name: string }>;
  current: string;
  onSelect: (key: string) => void;
}

/**
 * Fixed bar at the bottom of the screen for flipping between prototype variants.
 * Deliberately not styled like the form, so it never reads as part of the design
 * being judged. Hidden in production builds.
 */
export const PrototypeVariantSwitcher: React.FC<PrototypeVariantSwitcherProps> = ({
  variants,
  current,
  onSelect,
}) => {
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current)
  );

  const cycle = useCallback(
    (step: number) => {
      const next = (index + step + variants.length) % variants.length;
      onSelect(variants[next].key);
    },
    [index, variants, onSelect]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      if (target?.closest?.('.ace_editor')) return;
      if (event.key === 'ArrowLeft') cycle(-1);
      if (event.key === 'ArrowRight') cycle(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cycle]);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow
      style={{
        position: 'fixed',
        bottom: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9000,
        borderRadius: 999,
        background: '#1a1c21',
        color: '#fff',
        border: '2px solid #f04e98',
      }}
      data-test-subj="prototype-variant-switcher"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="arrowLeft"
            color="ghost"
            aria-label="Previous variant"
            onClick={() => cycle(-1)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" style={{ color: '#fff', whiteSpace: 'nowrap' }}>
            <strong>
              PROTOTYPE {index + 1}/{variants.length} — {variants[index]?.name}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="arrowRight"
            color="ghost"
            aria-label="Next variant"
            onClick={() => cycle(1)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
