/*
 * PROTOTYPE — throwaway. See ./README.md
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { GrammarBaseline } from './GrammarBaseline';
import { GrammarStepsVariant } from './GrammarStepsVariant';
import { GrammarTabsVariant } from './GrammarTabsVariant';
import { GrammarTableFlyoutVariant } from './GrammarTableFlyoutVariant';
import { GrammarOutlineVariant } from './GrammarOutlineVariant';
import { GrammarIssueVariant } from './GrammarIssueVariant';
import { GrammarVariantProps } from './GrammarVariantProps';

export { PrototypeVariantSwitcher } from './PrototypeVariantSwitcher';
export type { GrammarVariantProps } from './GrammarVariantProps';

export const GRAMMAR_VARIANTS: Array<{
  key: string;
  name: string;
  Component: React.FC<GrammarVariantProps>;
}> = [
  { key: 'baseline', name: 'Current', Component: GrammarBaseline },
  { key: 'steps', name: 'Pipeline steps', Component: GrammarStepsVariant },
  { key: 'tabs', name: 'Grammar tabs', Component: GrammarTabsVariant },
  { key: 'table', name: 'Summary + flyout', Component: GrammarTableFlyoutVariant },
  { key: 'outline', name: 'Outline, no cards', Component: GrammarOutlineVariant },
  { key: 'issue', name: 'Curated + YAML fallback', Component: GrammarIssueVariant },
];

export const DEFAULT_GRAMMAR_VARIANT = 'baseline';

export const resolveGrammarVariant = (key: string | undefined | null) =>
  GRAMMAR_VARIANTS.find((variant) => variant.key === key) ?? GRAMMAR_VARIANTS[0];
