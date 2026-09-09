/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  collectStructuralErrors,
  hasStructuralErrors,
  rowNeedsField,
} from './structuralValidation';
import { decoderEditorStateDefaultValue, DecoderFormModel } from './DecoderEditorFormModel';

const values = (overrides: Partial<DecoderFormModel> = {}): DecoderFormModel => ({
  ...decoderEditorStateDefaultValue,
  ...overrides,
});

describe('rowNeedsField', () => {
  it.each([
    [{ field: '', value: 'orphan' }, true],
    [{ field: '  ', value: 'orphan' }, true],
    [{ field: '', value: '' }, false],
    [{ field: 'a.b', value: '' }, false],
  ])('%p -> %p', (row, expected) => {
    expect(rowNeedsField(row)).toBe(expected);
  });
});

describe('collectStructuralErrors', () => {
  it('reports nothing for an empty form', () => {
    expect(hasStructuralErrors(collectStructuralErrors(values()))).toBe(false);
  });

  it('does not block on a schema violation — that is the advisory tier', () => {
    // No name, no metadata: invalid against the schema, but a document can still
    // be produced, so submission is not blocked.
    const errors = collectStructuralErrors(values({ name: '' }));
    expect(hasStructuralErrors(errors)).toBe(false);
  });

  it('blocks a map row that has a value but no field', () => {
    const errors = collectStructuralErrors(
      values({
        normalize: [
          {
            check: { mode: 'none' },
            parsers: [],
            map: [{ field: '', value: '$ip' }],
          },
        ],
      })
    );
    expect(errors.fields['normalize[0].map[0]']).toBe('field is required for this row');
  });

  it('blocks a parser with expressions but no field', () => {
    const errors = collectStructuralErrors(
      values({ parsers: [{ field: '', expressions: ['<~>'] }] })
    );
    expect(errors.fields['parsers[0]']).toBe('A parser needs the field it reads');
  });

  it('blocks an unparseable normalize entry', () => {
    const errors = collectStructuralErrors(
      values({
        normalize: [{ check: { mode: 'none' }, parsers: [], map: [], raw: 'map: [\n  broken' }],
      })
    );
    expect(errors.fields['normalize[0]']).toMatch(/^Invalid YAML/);
  });

  it('accepts a normalize entry whose raw YAML is valid but unmodelled', () => {
    const errors = collectStructuralErrors(
      values({
        normalize: [{ check: { mode: 'none' }, parsers: [], map: [], raw: 'map_if:\n  when: $x' }],
      })
    );
    expect(hasStructuralErrors(errors)).toBe(false);
  });

  it('blocks an unparseable check', () => {
    const errors = collectStructuralErrors(values({ check: { mode: 'yaml', raw: '- [unclosed' } }));
    expect(errors.fields.check).toMatch(/^Invalid YAML/);
  });

  it('ignores an empty row', () => {
    const errors = collectStructuralErrors(values({ definitions: [{ field: '', value: '' }] }));
    expect(hasStructuralErrors(errors)).toBe(false);
  });
});
