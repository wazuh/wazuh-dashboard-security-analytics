/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  buildLogTestRoute,
  buildLogTestVerdict,
  countNormalizedFields,
  describeUnavailableScope,
  describeUnavailableScopeReason,
  getScopeAvailability,
  isEngineEnvironmentMissing,
  parseNormalizedEvent,
  pickDefaultScope,
  readLogTestUrlState,
  writeLogTestUrlState,
} from './utils';

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

describe('buildLogTestVerdict by scope', () => {
  it('names a space the Engine never loaded instead of blaming the decoders', () => {
    expect(
      buildLogTestVerdict({
        normalizationStatus: 'error',
        normalizationErrorMessage: "The 'test' environment does not exist.",
        fieldCount: 0,
        rulesMatched: 0,
      })
    ).toEqual({ text: 'Engine environment not available', color: 'danger' });
  });

  it('reports only the parsing result for Normalization only', () => {
    expect(
      buildLogTestVerdict({ scope: 'normalization', fieldCount: 18, rulesMatched: 0 })
    ).toEqual({ text: 'Parsed into 18 fields', color: 'success' });
  });

  it('reports only the rules for Detection only', () => {
    const base = { scope: 'detection' as const, fieldCount: 0, detectionStatus: 'success' };

    expect(buildLogTestVerdict({ ...base, rulesMatched: 1, rulesEvaluated: 1 })).toEqual({
      text: '1 rule matched',
      color: 'success',
    });
    expect(buildLogTestVerdict({ ...base, rulesMatched: 0, rulesEvaluated: 50 })).toEqual({
      text: 'No rules matched',
      color: 'default',
    });
    expect(buildLogTestVerdict({ ...base, rulesMatched: 0, rulesEvaluated: 0 })).toEqual({
      text: 'No rules evaluated',
      color: 'default',
    });
    expect(buildLogTestVerdict({ ...base, detectionStatus: 'error', rulesMatched: 0 })).toEqual({
      text: 'Detection logic failed',
      color: 'danger',
    });
  });

  it('ignores a normalization status for Detection only, which never runs it', () => {
    expect(
      buildLogTestVerdict({
        scope: 'detection',
        normalizationStatus: 'error',
        detectionStatus: 'success',
        fieldCount: 0,
        rulesMatched: 1,
        rulesEvaluated: 1,
      }).text
    ).toBe('1 rule matched');
  });
});

describe('isEngineEnvironmentMissing', () => {
  it('recognizes the Engine message for a space it could not load', () => {
    expect(isEngineEnvironmentMissing("The 'test' environment does not exist.")).toBe(true);
    expect(isEngineEnvironmentMissing("The 'custom' environment does not exist.")).toBe(true);
  });

  it('leaves other normalization errors alone', () => {
    expect(isEngineEnvironmentMissing('Failed to parse protobuff json request')).toBe(false);
    expect(isEngineEnvironmentMissing(undefined)).toBe(false);
  });
});

describe('getScopeAvailability', () => {
  const withRules = { rulesCount: 2 };
  const withoutRules = { rulesCount: 0 };

  it('keeps every scope available while the space is still loading', () => {
    expect(getScopeAvailability(undefined)).toEqual({
      full: undefined,
      normalization: undefined,
      detection: undefined,
    });
  });

  it('leaves only Detection only for rules promoted without a root decoder (#1694)', () => {
    expect(getScopeAvailability({ hasRootDecoder: false, integrations: [withRules] })).toEqual({
      full: 'no-root-decoder',
      normalization: 'no-root-decoder',
      detection: undefined,
    });
  });

  it('leaves only Normalization only for decoders without rules', () => {
    expect(getScopeAvailability({ hasRootDecoder: true, integrations: [withoutRules] })).toEqual({
      full: undefined,
      normalization: undefined,
      detection: 'no-rules',
    });
  });

  it('needs an integration to pick for the combined test', () => {
    expect(getScopeAvailability({ hasRootDecoder: true, integrations: [] })).toEqual({
      full: 'no-integrations',
      normalization: undefined,
      detection: 'no-rules',
    });
  });

  it('allows every scope in a complete space', () => {
    expect(
      getScopeAvailability({ hasRootDecoder: true, integrations: [withoutRules, withRules] })
    ).toEqual({ full: undefined, normalization: undefined, detection: undefined });
  });
});

describe('pickDefaultScope', () => {
  it('prefers the combined test, then normalization, then detection', () => {
    expect(
      pickDefaultScope({ full: undefined, normalization: undefined, detection: undefined })
    ).toBe('full');
    expect(
      pickDefaultScope({ full: 'no-integrations', normalization: undefined, detection: 'no-rules' })
    ).toBe('normalization');
    expect(
      pickDefaultScope({
        full: 'no-root-decoder',
        normalization: 'no-root-decoder',
        detection: undefined,
      })
    ).toBe('detection');
  });

  it('falls back to the combined test when nothing can run', () => {
    expect(
      pickDefaultScope({
        full: 'no-root-decoder',
        normalization: 'no-root-decoder',
        detection: 'no-rules',
      })
    ).toBe('full');
  });
});

describe('describeUnavailableScope', () => {
  it('offers Detection only when the space has no root decoder but has rules', () => {
    const callout = describeUnavailableScope('no-root-decoder', 'test', {
      full: 'no-root-decoder',
      normalization: 'no-root-decoder',
      detection: undefined,
    });

    expect(callout.title).toBe('The test space has no root decoder');
    expect(callout.body).toContain('You can still test rules with Detection only.');
    expect(callout.switchTo).toBe('detection');
  });

  it('offers no switch when the other scope cannot run either', () => {
    const callout = describeUnavailableScope('no-root-decoder', 'custom', {
      full: 'no-root-decoder',
      normalization: 'no-root-decoder',
      detection: 'no-rules',
    });

    expect(callout.switchTo).toBeUndefined();
    expect(callout.body).not.toContain('Detection only');
  });

  it('offers Normalization only when no integration has rules', () => {
    const callout = describeUnavailableScope('no-rules', 'test', {
      full: undefined,
      normalization: undefined,
      detection: 'no-rules',
    });

    expect(callout.title).toBe('No integration in the test space has rules');
    expect(callout.switchTo).toBe('normalization');
  });

  it('names the space and the fix in the card tooltip', () => {
    expect(describeUnavailableScopeReason('no-root-decoder', 'test')).toBe(
      'Not available in the test space, because its policy has no root decoder. Select one in the draft space and promote it.'
    );
  });
});

describe('parseNormalizedEvent', () => {
  it('accepts a JSON object, nested or with dotted keys', () => {
    expect(parseNormalizedEvent('{"event": {"outcome": "failure"}}')).toEqual({
      value: { event: { outcome: 'failure' } },
    });
    expect(parseNormalizedEvent('{"event.outcome": "failure"}')).toEqual({
      value: { 'event.outcome': 'failure' },
    });
  });

  it('asks for an event when the editor is empty', () => {
    expect(parseNormalizedEvent('  \n ')).toEqual({ error: 'Enter a normalized event.' });
  });

  it('names what was entered instead of an object', () => {
    expect(parseNormalizedEvent('[]').error).toBe(
      'The normalized event must be a JSON object, not an array.'
    );
    expect(parseNormalizedEvent('null').error).toBe(
      'The normalized event must be a JSON object, not null.'
    );
    expect(parseNormalizedEvent('"sshd"').error).toBe(
      'The normalized event must be a JSON object, not a string.'
    );
  });

  it('reports invalid JSON with the parser message', () => {
    expect(parseNormalizedEvent('{"event": }').error).toMatch(
      /^The normalized event is not valid JSON: /
    );
  });
});

describe('Log test URL state', () => {
  const TESTABLE = ['test', 'custom', 'standard'];

  it('reads a deep link to Detection only', () => {
    expect(readLogTestUrlState('?space=test&scope=detection&integration=abc', TESTABLE)).toEqual({
      space: 'test',
      scope: 'detection',
      integration: 'abc',
    });
  });

  it('drops a space Log test cannot run in and an unknown scope', () => {
    expect(readLogTestUrlState('?space=draft&scope=everything', TESTABLE)).toEqual({
      space: undefined,
      scope: undefined,
      integration: undefined,
    });
  });

  it('writes its own params and keeps every other one', () => {
    const search = writeLogTestUrlState('dataSourceId=&integration=old', {
      space: 'custom',
      scope: 'normalization',
    });
    const params = new URLSearchParams(search);

    expect(params.get('dataSourceId')).toBe('');
    expect(params.get('space')).toBe('custom');
    expect(params.get('scope')).toBe('normalization');
    expect(params.has('integration')).toBe(false);
  });

  it('builds the Log test route for links from other pages', () => {
    expect(buildLogTestRoute({ space: 'test', scope: 'detection', integration: 'a b' })).toBe(
      '/log-test?space=test&scope=detection&integration=a+b'
    );
    expect(buildLogTestRoute({})).toBe('/log-test');
  });
});
