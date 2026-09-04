/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Mixes `colour` into `towards` by `amount` (0 keeps the colour, 1 returns the
 * target). Both are hex, in the `#RGB` or `#RRGGBB` form the EUI theme vars use.
 *
 * The decoder cascade dims by blending into the surface rather than by lowering
 * opacity: it draws on a canvas, where a translucent element composites over
 * whatever happens to be behind it instead of over the panel, which reads wrong
 * on the dark theme.
 */
export function blendColor(colour: string, towards: string, amount: number): string {
  const from = parseHex(colour);
  const to = parseHex(towards);
  const ratio = Math.max(0, Math.min(1, amount));

  const channel = (index: number): string => {
    const value = Math.round(from[index] + (to[index] - from[index]) * ratio);
    return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');
  };

  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

const BLACK: [number, number, number] = [0, 0, 0];

function parseHex(value: string): [number, number, number] {
  let hex = value.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }
  // Anything that isn't a full hex triplet falls back to black rather than
  // parsing partially: `parseInt` stops at the first invalid character, which
  // would turn a malformed value into an arbitrary colour.
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return BLACK;
  }
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}
