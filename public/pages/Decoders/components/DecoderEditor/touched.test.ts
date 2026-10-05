/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { emptyTouched, isTouched, visibleErrors, withTouched } from './touched';

describe('touched state', () => {
  it('shows nothing on a form that has not been touched', () => {
    expect(visibleErrors({ 'metadata.title': 'required' }, emptyTouched())).toEqual({});
  });

  it('shows a field its own error once blurred', () => {
    const touched = withTouched(emptyTouched(), 'metadata.title');
    expect(visibleErrors({ 'metadata.title': 'required', name: 'bad' }, touched)).toEqual({
      'metadata.title': 'required',
    });
  });

  it('shows a section error once something inside it was visited', () => {
    const touched = withTouched(emptyTouched(), 'normalize[0].map[0]');
    expect(isTouched(touched, 'normalize[0].map')).toBe(true);
    expect(isTouched(touched, 'normalize[0]')).toBe(true);
    expect(isTouched(touched, 'normalize[1]')).toBe(false);
  });

  it('shows a descendant error once its section was visited', () => {
    const touched = withTouched(emptyTouched(), 'normalize[0]');
    expect(isTouched(touched, 'normalize[0].map[0]')).toBe(true);
  });

  it('shows everything once submission is attempted', () => {
    const touched = { ...emptyTouched(), submitted: true };
    expect(visibleErrors({ 'metadata.title': 'required', name: 'bad' }, touched)).toEqual({
      'metadata.title': 'required',
      name: 'bad',
    });
  });

  it('does not mutate the state it is given', () => {
    const before = emptyTouched();
    withTouched(before, 'name');
    expect(before.paths.size).toBe(0);
  });
});
