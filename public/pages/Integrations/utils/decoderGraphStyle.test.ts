/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { DecoderGraphNode } from './decoderGraph';
import {
  DECODER_LEGEND_ITEMS,
  DecoderGraphPalette,
  getDecoderNodeCaption,
  getDecoderNodeStyle,
} from './decoderGraphStyle';

const palette: DecoderGraphPalette = {
  surface: '#FFF',
  root: '#DD0A73',
  member: '#006BB4',
  external: '#69707D',
  cycle: '#F5A700',
  edge: '#98A2B3',
  text: '#343741',
  fontFamily: 'monospace',
};

const node = (overrides: Partial<DecoderGraphNode> = {}): DecoderGraphNode => ({
  id: 'decoder/apache/0',
  label: 'decoder/apache/0',
  role: 'member',
  depth: 1,
  parents: ['decoder/integrations/0'],
  children: [],
  ancestors: [],
  descendants: [],
  ...overrides,
});

describe('getDecoderNodeStyle', () => {
  it('sets the root decoder apart by hue, on the emphasised border weight', () => {
    expect(getDecoderNodeStyle(node({ role: 'root', parents: [] }), palette)).toEqual({
      colour: palette.root,
      borderWidth: 2,
      dashed: false,
    });
  });

  it('gives a decoder of this integration a plain thin border', () => {
    expect(getDecoderNodeStyle(node(), palette)).toEqual({
      colour: palette.member,
      borderWidth: 1,
      dashed: false,
    });
  });

  it('dashes a parent the integration does not own', () => {
    expect(getDecoderNodeStyle(node({ role: 'external', parents: [] }), palette)).toEqual({
      colour: palette.external,
      borderWidth: 1,
      dashed: true,
    });
  });

  it('thickens a decoder that several branches share', () => {
    const shared = node({ parents: ['decoder/a/0', 'decoder/b/0'] });

    expect(getDecoderNodeStyle(shared, palette).borderWidth).toBe(2);
    // Weight, not hue: it stays a decoder of this integration.
    expect(getDecoderNodeStyle(shared, palette).colour).toBe(palette.member);
  });

  it('warns on a decoder that closes a parent cycle', () => {
    expect(getDecoderNodeStyle(node({ role: 'cycle' }), palette).colour).toBe(palette.cycle);
  });
});

describe('getDecoderNodeCaption', () => {
  it.each([
    ['root', 'root decoder'],
    ['cycle', 'parent cycle'],
  ] as const)('names the %s role', (role, expected) => {
    expect(getDecoderNodeCaption(node({ role }))).toBe(expected);
  });

  it('names a resolved external parent', () => {
    expect(getDecoderNodeCaption(node({ role: 'external', decoderId: 'uuid-1' }))).toBe(
      'outside this integration'
    );
  });

  it('flags an external parent that never resolved to a decoder', () => {
    expect(getDecoderNodeCaption(node({ role: 'external', decoderId: undefined }))).toBe(
      'not found'
    );
  });

  it('counts the parents when a decoder has several', () => {
    expect(getDecoderNodeCaption(node({ parents: ['a', 'b', 'c'] }))).toBe('3 parents');
  });

  it('falls back to the decoder title for an ordinary decoder', () => {
    expect(getDecoderNodeCaption(node({ title: 'Apache HTTP server' }))).toBe('Apache HTTP server');
  });

  it('returns an empty caption rather than "undefined" when there is no title', () => {
    expect(getDecoderNodeCaption(node())).toBe('');
  });
});

describe('DECODER_LEGEND_ITEMS', () => {
  it('covers every state the cascade draws', () => {
    expect(DECODER_LEGEND_ITEMS.map((item) => item.label)).toEqual([
      'Root decoder',
      'In this integration',
      'Parent outside this integration',
      'More than one parent',
      'Parent cycle',
    ]);
  });

  it('gives each entry the style of the node it stands for', () => {
    const styles = DECODER_LEGEND_ITEMS.map((item) => getDecoderNodeStyle(item.subject, palette));

    expect(styles).toEqual([
      { colour: palette.root, borderWidth: 2, dashed: false },
      { colour: palette.member, borderWidth: 1, dashed: false },
      { colour: palette.external, borderWidth: 1, dashed: true },
      { colour: palette.member, borderWidth: 2, dashed: false },
      { colour: palette.cycle, borderWidth: 2, dashed: false },
    ]);
  });

  it('keeps every entry visually distinct, so the key is worth reading', () => {
    const fingerprints = DECODER_LEGEND_ITEMS.map((item) => {
      const style = getDecoderNodeStyle(item.subject, palette);
      return `${style.colour}|${style.borderWidth}|${style.dashed}`;
    });

    expect(new Set(fingerprints).size).toBe(DECODER_LEGEND_ITEMS.length);
  });
});
