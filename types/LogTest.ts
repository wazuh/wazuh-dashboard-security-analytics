/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type LogTestTraceLevel = 'NONE' | 'ASSET_ONLY' | 'ALL';

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

export interface LogTestResponseMessage {
  normalization: LogTestNormalizationResult;
  detection: LogTestDetectionResult;
}

export interface LogTestResponse {
  status: string;
  message: LogTestResponseMessage;
}

export interface LogTestApiRequest {
  document: LogTestRequestBody;
}

// Wazuh: log-test-scoped failure classification. The response envelope always
// answers 200, so the kind is what lets the UI tell one failure from another.
// Kept here rather than on the shared envelope: these codes carry log test
// semantics and no other endpoint should inherit them.
export type LogTestErrorKind = 'payload-too-large';

export type LogTestServerResponse =
  | { ok: true; response: LogTestResponse }
  | { ok: false; error: string; errorKind?: LogTestErrorKind };
