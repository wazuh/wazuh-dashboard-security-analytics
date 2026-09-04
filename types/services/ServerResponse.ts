/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Wazuh: machine-readable classification for a failure the frontend must react
// to differently. The envelope always answers with statusCode 200, so the kind
// is what lets a caller tell one failure apart from another.
export type ServerErrorKind = 'payload-too-large';

export type ServerResponse<T> = FailedServerResponse | { ok: true; response: T };
export type FailedServerResponse = { ok: false; error: string; errorKind?: ServerErrorKind };
