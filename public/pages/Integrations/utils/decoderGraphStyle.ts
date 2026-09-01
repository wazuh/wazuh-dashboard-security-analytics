/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { DecoderGraphNode } from './decoderGraph';

/**
 * The visual language of the decoder cascade, kept apart from the component so
 * the diagram and its legend read the same rules — a legend that drifts from
 * what's drawn is worse than none.
 *
 * Colours arrive as a palette rather than being read here, so this stays pure
 * and testable while the component supplies the EUI theme vars.
 */
export interface DecoderGraphPalette {
  surface: string;
  member: string;
  external: string;
  cycle: string;
  edge: string;
  text: string;
  fontFamily: string;
}

export interface DecoderNodeStyle {
  colour: string;
  borderWidth: number;
  dashed: boolean;
}

/** What the style resolver needs; a legend swatch can supply just this much. */
export type DecoderStyleSubject = Pick<DecoderGraphNode, 'role'> & { parents: string[] };

export const hasSeveralParents = (node: DecoderStyleSubject): boolean => node.parents.length > 1;

export function getDecoderNodeStyle(
  node: DecoderStyleSubject,
  palette: DecoderGraphPalette
): DecoderNodeStyle {
  if (node.role === 'external') {
    return { colour: palette.external, borderWidth: 1, dashed: true };
  }
  if (node.role === 'cycle') {
    return { colour: palette.cycle, borderWidth: 2, dashed: false };
  }
  if (node.role === 'root') {
    return { colour: palette.member, borderWidth: 3, dashed: false };
  }
  // A decoder several branches share is the reason this is a graph and not a
  // tree, so it gets a weight of its own rather than only a caption.
  return { colour: palette.member, borderWidth: hasSeveralParents(node) ? 2 : 1, dashed: false };
}

/** The second line of a node, and the reason a role never rests on colour alone. */
export function getDecoderNodeCaption(node: DecoderGraphNode): string {
  switch (node.role) {
    case 'root':
      return 'root decoder';
    case 'external':
      return 'outside this integration';
    case 'cycle':
      return 'parent cycle';
    default:
      return hasSeveralParents(node) ? `${node.parents.length} parents` : node.title ?? '';
  }
}

export interface DecoderLegendItem {
  id: string;
  label: string;
  subject: DecoderStyleSubject;
}

/**
 * The key for the cascade. Each entry carries the same shape the resolver takes,
 * so a swatch is drawn from the very rule that draws the node it stands for.
 */
export const DECODER_LEGEND_ITEMS: DecoderLegendItem[] = [
  { id: 'root', label: 'Root decoder', subject: { role: 'root', parents: [] } },
  { id: 'member', label: 'In this integration', subject: { role: 'member', parents: ['one'] } },
  {
    id: 'external',
    label: 'Parent outside this integration',
    subject: { role: 'external', parents: [] },
  },
  {
    id: 'shared',
    label: 'More than one parent',
    subject: { role: 'member', parents: ['one', 'two'] },
  },
];
