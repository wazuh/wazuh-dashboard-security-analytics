/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { blendColor } from './blendColor';

describe('blendColor', () => {
  it('keeps the original colour when nothing is blended in', () => {
    expect(blendColor('#006BB4', '#FFFFFF', 0)).toBe('#006bb4');
  });

  it('returns the target colour when fully blended', () => {
    expect(blendColor('#006BB4', '#FFFFFF', 1)).toBe('#ffffff');
  });

  it('meets in the middle', () => {
    expect(blendColor('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('expands the three-digit hex the light EUI theme uses for the surface', () => {
    // euiColorEmptyShade is '#FFF' on the light theme.
    expect(blendColor('#000000', '#FFF', 1)).toBe('#ffffff');
  });

  it('dims towards the dark surface rather than towards white', () => {
    // euiColorPrimary and euiColorEmptyShade on the dark theme.
    expect(blendColor('#1BA9F5', '#1D1E24', 0.75)).toBe('#1d4158');
  });

  it('clamps an amount outside 0..1 instead of overshooting the channel range', () => {
    expect(blendColor('#FFFFFF', '#000000', 5)).toBe('#000000');
    expect(blendColor('#FFFFFF', '#000000', -3)).toBe('#ffffff');
  });

  it('treats a malformed colour as black rather than emitting NaN', () => {
    expect(blendColor('not-a-colour', '#000000', 0)).toBe('#000000');
  });
});
