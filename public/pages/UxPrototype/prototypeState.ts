/* PROTOTYPE — throwaway. URL is the single source of truth for the prototype's state. */

import { StageId } from './mockData';

export type VariantId = 'A' | 'B' | 'C';
export type ScreenId = 'overview' | 'decoders' | 'logtest' | 'promote';

export const VARIANTS: Array<{ id: VariantId; name: string }> = [
  { id: 'A', name: 'Ribbon band under the breadcrumbs' },
  { id: 'B', name: 'Pill in the global header' },
  { id: 'C', name: 'Pipeline in the left rail' },
];

export interface PrototypeState {
  variant: VariantId;
  screen: ScreenId;
  stage: StageId;
}

const isVariant = (v: string | null): v is VariantId => v === 'A' || v === 'B' || v === 'C';

const isScreen = (s: string | null): s is ScreenId =>
  s === 'overview' || s === 'decoders' || s === 'logtest' || s === 'promote';

const isStage = (s: string | null): s is StageId =>
  s === 'draft' || s === 'test' || s === 'custom' || s === 'standard';

export const parseState = (search: string): PrototypeState => {
  const params = new URLSearchParams(search);
  const variant = params.get('variant');
  const screen = params.get('screen');
  const stage = params.get('stage');
  return {
    variant: isVariant(variant) ? variant : 'A',
    screen: isScreen(screen) ? screen : 'overview',
    stage: isStage(stage) ? stage : 'draft',
  };
};

export const buildSearch = (state: PrototypeState): string =>
  `?variant=${state.variant}&screen=${state.screen}&stage=${state.stage}`;

export const nextVariant = (current: VariantId, step: 1 | -1): VariantId => {
  const index = VARIANTS.findIndex((v) => v.id === current);
  const next = (index + step + VARIANTS.length) % VARIANTS.length;
  return VARIANTS[next].id;
};
