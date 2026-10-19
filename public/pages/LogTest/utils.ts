/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { LogTestScope } from '../../../types';
import { ROUTES } from '../../utils/constants';
import { METADATA_FIELDS } from './constants';

export interface MetadataEntry {
  key: string;
  value: string;
}

/** Converts a flat array of {key, value} dotted path entries into a nested object.
 *  Number-typed fields are cast to number. Empty keys/values are skipped.
 *  e.g. [{ key: 'agent.id', value: '1' }] => { agent: { id: 1 } }
 */
export function buildMetadataObject(
  entries: MetadataEntry[]
): Record<string, string | number | object> {
  const result: Record<string, any> = {};

  for (const { key, value } of entries) {
    if (!key || value === '') continue;

    const parts = key.split('.');
    let cursor = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object') {
        cursor[parts[i]] = {};
      }
      cursor = cursor[parts[i]];
    }

    const leaf = parts[parts.length - 1];
    const fieldDef = METADATA_FIELDS.find((f) => f.key === key);
    cursor[leaf] = fieldDef?.type === 'number' ? Number(value) : value;
  }

  return result;
}

/** Counts the leaves of a normalized output object, so nested fields are not counted twice. */
export function countNormalizedFields(output: unknown): number {
  if (!output || typeof output !== 'object') return 0;
  if (Array.isArray(output)) return output.length ? 1 : 0;

  return Object.values(output as Record<string, unknown>).reduce<number>((total, value) => {
    const isPlainObject = !!value && typeof value === 'object' && !Array.isArray(value);
    return total + (isPlainObject ? countNormalizedFields(value) : 1);
  }, 0);
}

export interface LogTestVerdict {
  /** Plain-language outcome, replacing the engine's raw status code. */
  text: string;
  /**
   * Wazuh: `warning` is reserved for a test that did not answer the question, not for an
   * answer of "no". An event that matched nothing is a complete, often intended result,
   * so it stays neutral.
   */
  color: 'success' | 'warning' | 'danger' | 'default';
}

// Wazuh: the Engine reports a space it could not load as "The 'test' environment does
// not exist.", from the combined endpoint inline and from normalization as a 400. The
// usual cause is a space promoted without a root decoder (wazuh-indexer-plugins#1694).
const ENGINE_ENVIRONMENT_MISSING = /environment does not exist/i;

export const isEngineEnvironmentMissing = (message?: string): boolean =>
  !!message && ENGINE_ENVIRONMENT_MISSING.test(message);

/**
 * Wazuh: the engine returns a status code, which said nothing to the user. The wording
 * follows the published docs, which define the tool as validating that an event "is
 * correctly parsed by active decoders" and then testing "detection logic".
 */
export function buildLogTestVerdict(args: {
  scope?: LogTestScope;
  normalizationStatus?: string;
  normalizationErrorMessage?: string;
  detectionStatus?: string;
  fieldCount: number;
  rulesMatched: number;
  rulesEvaluated?: number;
}): LogTestVerdict {
  const {
    scope = 'full',
    normalizationStatus,
    normalizationErrorMessage,
    detectionStatus,
    fieldCount,
    rulesMatched,
    rulesEvaluated,
  } = args;

  if (scope !== 'detection' && normalizationStatus === 'error') {
    // Wazuh: "not parsed" blamed the decoders for a space the Engine never loaded.
    return isEngineEnvironmentMissing(normalizationErrorMessage)
      ? { text: 'Engine environment not available', color: 'danger' }
      : { text: 'Not parsed by active decoders', color: 'danger' };
  }

  // Wazuh: the actor is dropped here on purpose. This clause sits above the Normalization
  // tab, which already frames who parses, and the badge has a second clause to fit. The
  // failure branch above keeps it, since there nothing else competes for the space and the
  // user needs to know no active decoder claimed the event.
  const parsed = `Parsed into ${fieldCount} ${fieldCount === 1 ? 'field' : 'fields'}`;

  if (scope === 'normalization') {
    return { text: parsed, color: 'success' };
  }

  const matched = `${rulesMatched} ${rulesMatched === 1 ? 'rule' : 'rules'} matched`;

  if (scope === 'detection') {
    if (detectionStatus === 'error') return { text: 'Detection logic failed', color: 'danger' };
    if (rulesEvaluated === 0) return { text: 'No rules evaluated', color: 'default' };
    return rulesMatched > 0
      ? { text: matched, color: 'success' }
      : { text: 'No rules matched', color: 'default' };
  }

  if (detectionStatus === 'error') {
    return { text: `${parsed}, detection logic failed`, color: 'danger' };
  }

  if (detectionStatus === 'skipped') {
    return { text: `${parsed}, detection logic skipped`, color: 'warning' };
  }

  if (rulesMatched > 0) {
    return { text: `${parsed}, ${matched}`, color: 'success' };
  }

  return { text: `${parsed}, no rules matched`, color: 'default' };
}

/* ----------------------------- Test scopes ----------------------------- */

export type LogTestScopeUnavailableReason = 'no-root-decoder' | 'no-integrations' | 'no-rules';

/** What the page knows about a space before a test runs, from its policy. */
export interface LogTestSpaceReadiness {
  hasRootDecoder: boolean;
  integrations: Array<{ rulesCount?: number }>;
}

export type LogTestScopeAvailability = Record<
  LogTestScope,
  LogTestScopeUnavailableReason | undefined
>;

const ALL_SCOPES_AVAILABLE: LogTestScopeAvailability = {
  full: undefined,
  normalization: undefined,
  detection: undefined,
};

/**
 * Wazuh: which scopes can run in a space, and why not. Normalization needs the root
 * decoder; detection needs an integration with rules; the combined test needs both a
 * root decoder and an integration to pick. With no readiness yet (still loading) every
 * scope stays available, so a slow policy fetch never blocks the form.
 */
export function getScopeAvailability(readiness?: LogTestSpaceReadiness): LogTestScopeAvailability {
  if (!readiness) return ALL_SCOPES_AVAILABLE;

  const { hasRootDecoder, integrations } = readiness;
  const hasRules = integrations.some((integration) => (integration.rulesCount ?? 0) > 0);

  return {
    full: !hasRootDecoder
      ? 'no-root-decoder'
      : integrations.length === 0
      ? 'no-integrations'
      : undefined,
    normalization: hasRootDecoder ? undefined : 'no-root-decoder',
    detection: hasRules ? undefined : 'no-rules',
  };
}

export const LOG_TEST_SCOPE_ORDER: LogTestScope[] = ['full', 'normalization', 'detection'];

/** The first available scope in card order, falling back to the combined test. */
export const pickDefaultScope = (availability: LogTestScopeAvailability): LogTestScope =>
  LOG_TEST_SCOPE_ORDER.find((scope) => !availability[scope]) ?? 'full';

/** The tooltip on a scope card that cannot run in this space. */
export function describeUnavailableScopeReason(
  reason: LogTestScopeUnavailableReason,
  space: string
): string {
  switch (reason) {
    case 'no-root-decoder':
      return `Not available in the ${space} space, because its policy has no root decoder. Select one in the draft space and promote it.`;
    case 'no-integrations':
      return `Not available in the ${space} space, because it has no integrations.`;
    case 'no-rules':
      return `Not available in the ${space} space, because none of its integrations has rules.`;
  }
}

export interface LogTestScopeCallout {
  title: string;
  body: string;
  /** A scope that can run here instead, offered as a one-click switch. */
  switchTo?: LogTestScope;
}

/** Wazuh: the callout above the form when the selected scope cannot run in this space. */
export function describeUnavailableScope(
  reason: LogTestScopeUnavailableReason,
  space: string,
  availability: LogTestScopeAvailability
): LogTestScopeCallout {
  switch (reason) {
    case 'no-root-decoder': {
      const switchTo = availability.detection ? undefined : 'detection';
      return {
        title: `The ${space} space has no root decoder`,
        body: `The Engine needs a root decoder to decode logs, so normalization is not available in this space.${
          switchTo ? ' You can still test rules with Detection only.' : ''
        }`,
        switchTo,
      };
    }
    case 'no-integrations': {
      const switchTo = availability.normalization ? undefined : 'normalization';
      return {
        title: `The ${space} space has no integrations`,
        body: `Detection evaluates the rules of an integration, and this space has none.${
          switchTo ? ' You can still test decoders with Normalization only.' : ''
        }`,
        switchTo,
      };
    }
    case 'no-rules': {
      const switchTo = availability.normalization ? undefined : 'normalization';
      return {
        title: `No integration in the ${space} space has rules`,
        body: `Detection only evaluates the rules of an integration, and none are loaded in this space.${
          switchTo ? ' You can still test decoders with Normalization only.' : ''
        }`,
        switchTo,
      };
    }
  }
}

/* --------------------------- Normalized event --------------------------- */

export type ParsedNormalizedEvent =
  | { value: Record<string, unknown>; error?: undefined }
  | { value?: undefined; error: string };

/**
 * Wazuh: the detection endpoint only takes a JSON object and answers anything else with
 * "Invalid 'input' format.", so the editor content is checked here, where the error can
 * name what is wrong.
 */
export function parseNormalizedEvent(text: string): ParsedNormalizedEvent {
  if (!text.trim()) return { error: 'Enter a normalized event.' };

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return {
      error: `The normalized event is not valid JSON: ${(error as Error)?.message ?? error}`,
    };
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    const type = Array.isArray(value) ? 'an array' : value === null ? 'null' : `a ${typeof value}`;
    return { error: `The normalized event must be a JSON object, not ${type}.` };
  }

  return { value: value as Record<string, unknown> };
}

/* ------------------------------ Deep links ------------------------------ */

export const LOG_TEST_URL_PARAMS = {
  SPACE: 'space',
  SCOPE: 'scope',
  INTEGRATION: 'integration',
} as const;

export interface LogTestUrlState {
  space?: string;
  scope?: LogTestScope;
  integration?: string;
}

const isLogTestScope = (value: string | null): value is LogTestScope =>
  !!value && (LOG_TEST_SCOPE_ORDER as string[]).includes(value);

/**
 * Wazuh: the URL is untrusted input, so a space Log test cannot run in (draft, or a typo)
 * and an unknown scope are dropped rather than passed on to the form.
 */
export function readLogTestUrlState(search: string, testableSpaces: string[]): LogTestUrlState {
  const params = new URLSearchParams(search);
  const space = params.get(LOG_TEST_URL_PARAMS.SPACE);
  const scope = params.get(LOG_TEST_URL_PARAMS.SCOPE);
  const integration = params.get(LOG_TEST_URL_PARAMS.INTEGRATION);

  return {
    space: space && testableSpaces.includes(space) ? space : undefined,
    scope: isLogTestScope(scope) ? scope : undefined,
    integration: integration || undefined,
  };
}

/** Writes the Log test params into `search`, keeping every other param (e.g. dataSourceId). */
export function writeLogTestUrlState(search: string, state: LogTestUrlState): string {
  const params = new URLSearchParams(search);
  (Object.keys(LOG_TEST_URL_PARAMS) as Array<keyof typeof LOG_TEST_URL_PARAMS>).forEach((key) => {
    const name = LOG_TEST_URL_PARAMS[key];
    const value = state[name];
    if (value) params.set(name, value);
    else params.delete(name);
  });
  return params.toString();
}

/** The Log test route with its state in the query, for links from other pages. */
export const buildLogTestRoute = (state: LogTestUrlState): string => {
  const search = writeLogTestUrlState('', state);
  return search ? `${ROUTES.LOG_TEST}?${search}` : ROUTES.LOG_TEST;
};
