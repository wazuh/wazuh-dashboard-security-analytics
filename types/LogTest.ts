/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type LogTestTraceLevel = 'NONE' | 'ASSET_ONLY' | 'ALL';

// Wazuh: which part of the pipeline a log test runs. Each scope calls its own
// content manager endpoint: `full` the combined `/logtest`, `normalization` the
// Engine-only `/logtest/normalization`, and `detection` the Engine-free
// `/logtest/detection`, which still works in a space that has no root decoder.
export type LogTestScope = 'full' | 'normalization' | 'detection';

export interface LogTestRequestBody {
  queue: number;
  location: string;
  metadata?: Record<string, string | number | object>;
  event: string;
  trace_level?: LogTestTraceLevel;
  space: string;
  integration?: string;
}

export interface LogTestAssetTrace {
  asset: string;
  success: boolean;
  traces: string[];
}

export interface LogTestValidationError {
  path: string;
  kind: 'unknown_field' | 'invalid_type' | 'temporary_field_not_allowed';
  expected?: string | null;
  actual?: string | null;
  [key: string]: unknown;
}

export interface LogTestValidation {
  valid: boolean;
  errors: LogTestValidationError[];
}

export type LogTestNormalizationStatus = 'success' | 'error';

export interface LogTestNormalizationError {
  message: string;
  code: string;
}

export interface LogTestNormalizationResult {
  status?: LogTestNormalizationStatus;
  output?: object;
  error?: LogTestNormalizationError;
  asset_traces?: LogTestAssetTrace[];
  validation?: LogTestValidation;
}

export type LogTestDetectionStatus = 'success' | 'skipped' | 'error';

export interface LogTestDetectionRuleMatch {
  rule: {
    id: string;
    title: string;
    level: string;
    tags: string[];
  };
  matched_conditions: string[];
}

export interface LogTestDetectionResult {
  status: LogTestDetectionStatus;
  rules_evaluated?: number;
  rules_matched?: number;
  matches?: LogTestDetectionRuleMatch[];
  reason?: string;
}

// Wazuh: a partial scope answers with only its own half, so both are optional.
export interface LogTestResponseMessage {
  normalization?: LogTestNormalizationResult;
  detection?: LogTestDetectionResult;
}

export interface LogTestResponse {
  status: string;
  message: LogTestResponseMessage;
}

export interface LogTestApiRequest {
  document: LogTestRequestBody;
}

export type LogTestNormalizationRequestBody = Omit<LogTestRequestBody, 'integration'>;

export interface LogTestNormalizationApiRequest {
  document: LogTestNormalizationRequestBody;
}

export interface LogTestDetectionRequestBody {
  space: string;
  integration: string;
  /** An already normalized event: the fields the integration's rules are evaluated against. */
  input: Record<string, unknown>;
}

export interface LogTestDetectionApiRequest {
  document: LogTestDetectionRequestBody;
}

// Wazuh: log-test-scoped failure classification. The response envelope always
// answers 200, so the kind is what lets the UI tell one failure from another.
// Kept here rather than on the shared envelope: these codes carry log test
// semantics and no other endpoint should inherit them.
export type LogTestErrorKind = 'payload-too-large';

export type LogTestServerResponse =
  | { ok: true; response: LogTestResponse }
  | { ok: false; error: string; errorKind?: LogTestErrorKind };
