/* PROTOTYPE — throwaway. Floating variant switcher. Deliberately not styled like the product. */

import React, { useEffect } from 'react';
import { EuiButtonIcon, EuiText } from '@elastic/eui';
import { VariantId, VARIANTS, nextVariant } from './prototypeState';

interface Props {
  variant: VariantId;
  onChange: (variant: VariantId) => void;
}

export const PrototypeSwitcher: React.FC<Props> = ({ variant, onChange }) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      if (event.key === 'ArrowLeft') onChange(nextVariant(variant, -1));
      if (event.key === 'ArrowRight') onChange(nextVariant(variant, 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [variant, onChange]);

  const current = VARIANTS.find((v) => v.id === variant) ?? VARIANTS[0];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 999,
        background: '#16181D',
        color: '#FFFFFF',
        boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
      }}
    >
      <EuiButtonIcon
        aria-label="Previous variant"
        iconType="arrowLeft"
        color="ghost"
        onClick={() => onChange(nextVariant(variant, -1))}
      />
      <EuiText size="xs" style={{ color: '#FFFFFF', whiteSpace: 'nowrap', fontWeight: 600 }}>
        PROTOTYPE · {current.id} — {current.name}
      </EuiText>
      <EuiButtonIcon
        aria-label="Next variant"
        iconType="arrowRight"
        color="ghost"
        onClick={() => onChange(nextVariant(variant, 1))}
      />
    </div>
  );
};
