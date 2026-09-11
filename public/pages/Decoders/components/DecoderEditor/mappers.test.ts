/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { LosslessNumber } from 'lossless-json';
import {
  checkToModel,
  isRenderableNormalizeEntry,
  mapDecoderToForm,
  mapFormToDecoder,
  normalizeEntryToModel,
  textToValue,
  valueToText,
} from './mappers';
import { DecoderFormModel } from './DecoderEditorFormModel';

const baseDocument = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  name: 'decoder/syslog/0',
  enabled: true,
  metadata: {
    title: 'Syslog',
    author: 'Wazuh',
    description: 'Parses syslog events',
  },
};

/**
 * The property the whole editor rests on: opening a decoder and saving it without
 * touching anything must produce the same document. Anything this editor cannot
 * model has to survive the trip, because the schema is downloaded and can be ahead
 * of this code.
 */
describe('round trip', () => {
  const roundTrip = (document: object) => mapFormToDecoder(mapDecoderToForm(document));

  const cases: Array<[string, object]> = [
    ['minimal document', baseDocument],
    [
      'every metadata key, including explicitly empty ones',
      {
        ...baseDocument,
        metadata: {
          title: 'Syslog',
          author: 'Wazuh',
          description: 'Parses syslog events',
          documentation: '',
          references: [],
          supports: ['linux'],
          compatibility: ['5.0'],
          date: '2026-01-15',
          modified: '2026-02-01T10:30:00Z',
        },
      },
    ],
    [
      'parents and definitions',
      {
        ...baseDocument,
        parents: ['decoder/integrations/0'],
        definitions: { _threshold: new LosslessNumber('5.0'), _label: 'auth' },
      },
    ],
    ['check as an expression', { ...baseDocument, check: '$event.module == syslog' }],
    [
      'check as a list',
      { ...baseDocument, check: [{ 'event.module': 'syslog' }, { 'host.os.platform': 'ubuntu' }] },
    ],
    // The five _normalizeBlock.oneOf shapes.
    [
      'normalize shape 1 — map only',
      { ...baseDocument, normalize: [{ map: [{ 'event.kind': 'event' }] }] },
    ],
    [
      'normalize shape 2 — check + map',
      { ...baseDocument, normalize: [{ check: '$x == 1', map: [{ 'event.kind': 'event' }] }] },
    ],
    [
      'normalize shape 3 — check + parse| + map',
      {
        ...baseDocument,
        normalize: [
          { check: '$x == 1', 'parse|message': ['<~>'], map: [{ 'event.kind': 'event' }] },
        ],
      },
    ],
    [
      'normalize shape 4 — check + parse|',
      { ...baseDocument, normalize: [{ check: '$x == 1', 'parse|message': ['<~>'] }] },
    ],
    [
      'normalize shape 5 — parse| only',
      { ...baseDocument, normalize: [{ 'parse|event.original': ['<~>', '<other>'] }] },
    ],
    ['top-level parse| key', { ...baseDocument, 'parse|message': ['<~>'] }],
    [
      'values that are not strings',
      {
        ...baseDocument,
        normalize: [
          {
            map: [
              { 'source.port': new LosslessNumber('443') },
              { 'event.duration': new LosslessNumber('5.0') },
              { 'network.forwarded': true },
              { 'error.message': null },
              { 'related.ip': ['10.0.0.1', '10.0.0.2'] },
              { 'labels.raw': { nested: 'object' } },
              { 'log.level': 'true' },
            ],
          },
        ],
      },
    ],
    ['an unknown top-level key', { ...baseDocument, map_if: [{ 'a.b': 1 }] }],
    [
      'a normalize entry this editor cannot render',
      {
        ...baseDocument,
        normalize: [
          { map: [{ 'event.kind': 'event' }] },
          { map_if: { when: '$x' } },
          { 'parse|message': ['<~>'] },
        ],
      },
    ],
  ];

  it.each(cases)('preserves %s', (_label, document) => {
    expect(roundTrip(document)).toEqual(document);
  });

  it('keeps an unrenderable normalize entry at its original index', () => {
    const document = {
      ...baseDocument,
      normalize: [{ map: [{ a: '1' }] }, { map_if: { when: '$x' } }, { map: [{ b: '2' }] }],
    };
    const form = mapDecoderToForm(document);

    expect(form.normalize).toHaveLength(3);
    expect(form.normalize[1].raw).toBeDefined();
    expect(form.normalize[0].raw).toBeUndefined();
    expect((mapFormToDecoder(form).normalize as unknown[])[1]).toEqual({ map_if: { when: '$x' } });
  });
});

describe('mapDecoderToForm', () => {
  it('collects unmodelled top-level keys into __preserved', () => {
    const form = mapDecoderToForm({ ...baseDocument, map_if: 'x', another: 1 });
    expect(form.__preserved).toEqual({ map_if: 'x', another: 1 });
  });

  it('does not treat modelled or parse| keys as preserved', () => {
    const form = mapDecoderToForm({ ...baseDocument, 'parse|message': ['<~>'], normalize: [] });
    expect(form.__preserved).toEqual({});
    expect(form.parsers).toEqual([{ field: 'message', expressions: ['<~>'] }]);
  });

  it('defaults enabled to true when absent', () => {
    expect(mapDecoderToForm({ name: 'decoder/a/0' }).enabled).toBe(true);
  });

  it('returns defaults for a non-object document', () => {
    expect(mapDecoderToForm(undefined).name).toBe('');
    expect(mapDecoderToForm('nonsense').normalize).toEqual([]);
  });
});

describe('mapFormToDecoder', () => {
  const form = (overrides: Partial<DecoderFormModel> = {}): DecoderFormModel => ({
    ...mapDecoderToForm(baseDocument),
    ...overrides,
  });

  it('drops rows with no field name', () => {
    const document = mapFormToDecoder(
      form({
        normalize: [
          {
            check: { mode: 'none' },
            parsers: [{ field: '  ', expressions: ['<~>'] }],
            map: [
              { field: 'event.kind', value: 'event' },
              { field: '', value: 'orphan' },
            ],
          },
        ],
      })
    );
    expect(document.normalize).toEqual([{ map: [{ 'event.kind': 'event' }] }]);
  });

  it('omits an empty check rather than writing an empty value', () => {
    const document = mapFormToDecoder(form({ check: { mode: 'expression', expression: '   ' } }));
    expect('check' in document).toBe(false);
  });

  it('drops normalize and definitions when emptied, rather than writing an invalid empty one', () => {
    // The schema sets minItems: 1 on `normalize` and minProperties: 1 on
    // `definitions`, so `normalize: []` is rejected by the engine. Emptying the
    // section has to remove the key, even though the loaded document had it.
    const loaded = mapDecoderToForm({
      ...baseDocument,
      normalize: [{ map: [{ 'event.kind': 'event' }] }],
      definitions: { _threshold: '5' },
    });
    const emptied = mapFormToDecoder({ ...loaded, normalize: [], definitions: [] });

    expect('normalize' in emptied).toBe(false);
    expect('definitions' in emptied).toBe(false);
  });

  it('does not invent optional keys that were never in the document', () => {
    const document = mapFormToDecoder(form());
    expect('parents' in document).toBe(false);
    expect('normalize' in document).toBe(false);
    expect('documentation' in (document.metadata as object)).toBe(false);
  });

  it('keeps preserved keys alongside modelled ones', () => {
    const document = mapFormToDecoder(form({ __preserved: { map_if: 'x' } }));
    expect(document).toMatchObject({ map_if: 'x', name: 'decoder/syslog/0' });
  });
});

describe('value text conversion', () => {
  it.each([
    ['a plain string', '$ip', '$ip'],
    ['a string that would re-parse as a boolean', 'true', '"true"'],
    ['a string that would re-parse as a number', '42', '"42"'],
    ['null', null, 'null'],
    ['a boolean', true, 'true'],
  ])('renders %s', (_label, value, expected) => {
    expect(valueToText(value)).toBe(expected);
  });

  it('keeps a trailing-zero float lossless', () => {
    expect(valueToText(new LosslessNumber('5.0'))).toBe('5.0');
    expect(String(textToValue('5.0'))).toBe('5.0');
  });

  it('renders objects and arrays as indented JSON', () => {
    expect(valueToText({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it('reads empty text as an empty string', () => {
    expect(textToValue('   ')).toBe('');
  });
});

describe('checkToModel', () => {
  it('reads an expression', () => {
    expect(checkToModel('$a == 1')).toEqual({ mode: 'expression', expression: '$a == 1' });
  });

  it('reads a list', () => {
    expect(checkToModel([{ 'a.b': 1 }])).toEqual({
      mode: 'list',
      rows: [{ field: 'a.b', condition: '1' }],
    });
  });

  it('falls back to yaml for a shape neither branch models', () => {
    expect(checkToModel({ unexpected: true })).toEqual({
      mode: 'yaml',
      raw: 'unexpected: true',
    });
  });

  it('reads a missing check as none', () => {
    expect(checkToModel(undefined)).toEqual({ mode: 'none' });
  });
});

describe('isRenderableNormalizeEntry', () => {
  it.each([
    [{ map: [{ a: 1 }] }, true],
    [{ check: '$a == 1', map: [{ a: 1 }] }, true],
    [{ 'parse|message': ['<~>'] }, true],
    [{ map_if: [] }, false],
    [{ 'parse|message': 'not-a-list' }, false],
    [{ map: 'not-a-list' }, false],
    [{ map: [{ a: 1, b: 2 }] }, false],
    ['not an object', false],
  ])('%p -> %p', (entry, expected) => {
    expect(isRenderableNormalizeEntry(entry)).toBe(expected);
  });

  it('carries an unrenderable entry as text', () => {
    expect(normalizeEntryToModel({ map_if: { when: '$x' } }).raw).toBe('map_if:\n  when: $x');
  });
});
