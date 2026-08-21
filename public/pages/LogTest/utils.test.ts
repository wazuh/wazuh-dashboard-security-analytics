/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { buildLogTestVerdict, countNormalizedFields } from './utils';

describe('countNormalizedFields', () => {
  it('counts leaves, not the objects that hold them', () => {
    expect(
      countNormalizedFields({
        agent: { id: '001', name: 'srv' },
        event: { original: 'raw line' },
      })
    ).toBe(3);
  });

  it('treats an array as a single field so its items are not counted', () => {
    expect(countNormalizedFields({ tags: ['a', 'b', 'c'] })).toBe(1);
  });

  it('returns zero when there is no output', () => {
    expect(countNormalizedFields(undefined)).toBe(0);
    expect(countNormalizedFields({})).toBe(0);
  });
});

describe('buildLogTestVerdict', () => {
  it('says the event was not parsed when normalization failed', () => {
    const verdict = buildLogTestVerdict({
      normalizationStatus: 'error',
      detectionStatus: 'success',
      fieldCount: 0,
      rulesMatched: 0,
    });

    expect(verdict).toEqual({ text: 'Not parsed by active decoders', color: 'danger' });
  });

  it('reports the matched rules when detection matched', () => {
    const verdict = buildLogTestVerdict({
      normalizationStatus: 'success',
      detectionStatus: 'success',
      fieldCount: 12,
      rulesMatched: 2,
    });

    expect(verdict).toEqual({
      text: 'Parsed into 12 fields, 2 rules matched',
      color: 'success',
    });
  });

  it('singularizes a single field and a single rule', () => {
    expect(
      buildLogTestVerdict({
        normalizationStatus: 'success',
        detectionStatus: 'success',
        fieldCount: 1,
        rulesMatched: 1,
      }).text
    ).toBe('Parsed into 1 field, 1 rule matched');
  });

  it('separates a parsed event that matched nothing from a failed one', () => {
    const verdict = buildLogTestVerdict({
      normalizationStatus: 'success',
      detectionStatus: 'success',
      fieldCount: 8,
      rulesMatched: 0,
    });

    expect(verdict).toEqual({
      text: 'Parsed into 8 fields, no rules matched',
      color: 'default',
    });
  });

  it('keeps a matched-nothing verdict neutral, since it is a complete answer', () => {
    // warning is for a test that did not answer, not for an answer of "no": probing that a
    // benign event matches nothing is a pass, and must not read as a problem.
    const matchedNothing = buildLogTestVerdict({
      normalizationStatus: 'success',
      detectionStatus: 'success',
      fieldCount: 3,
      rulesMatched: 0,
    });
    const didNotRun = buildLogTestVerdict({
      normalizationStatus: 'success',
      detectionStatus: 'skipped',
      fieldCount: 3,
      rulesMatched: 0,
    });

    expect(matchedNothing.color).toBe('default');
    expect(didNotRun.color).toBe('warning');
  });

  it('keeps the parsing result visible when detection was skipped or failed', () => {
    expect(
      buildLogTestVerdict({
        normalizationStatus: 'success',
        detectionStatus: 'skipped',
        fieldCount: 5,
        rulesMatched: 0,
      })
    ).toEqual({
      text: 'Parsed into 5 fields, detection logic skipped',
      color: 'warning',
    });

    expect(
      buildLogTestVerdict({
        normalizationStatus: 'success',
        detectionStatus: 'error',
        fieldCount: 5,
        rulesMatched: 0,
      })
    ).toEqual({
      text: 'Parsed into 5 fields, detection logic failed',
      color: 'danger',
    });
  });
});
