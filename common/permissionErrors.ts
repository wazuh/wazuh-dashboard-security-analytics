/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Wazuh: the content manager rejects an unauthorized write with an exception that quotes the
 * denied action, the username and its role bindings, e.g.
 *
 *   no permissions for [cluster:admin/content_manager/integration/create] and
 *   User [name=wazuh-readonly, backend_roles=[], requestedTenant=null]
 *
 * Rendering that verbatim in a toast leaks the identity block to the browser. These helpers turn
 * it into plain-language copy and scrub the identity block out of anything else that reaches the
 * UI. They live in `common/` because both layers sanitize: `server/utils/helpers.ts`
 * (`extractErrorMessage`) so the detail never crosses the wire, and `public/utils/helpers.tsx`
 * (`getErrorMessage`) for errors raised in the browser. Callers log the raw error first.
 */

/**
 * Fixed opening line for every authorization denial. Kept character-for-character identical to
 * `PERMISSION_DENIED_MESSAGE` in wazuh-dashboard-plugins
 * (`plugins/wazuh-ai-assistant/server/routes/route-helpers.ts`) so the same denial reads the same
 * way wherever the user meets it.
 */
export const PERMISSION_DENIED_MESSAGE = 'You do not have permission to perform this action.';

/**
 * Guards what {@link permissionDeniedMessage} is allowed to quote back: an action name, nothing
 * else. The identity block's `name=...` and `backend_roles=[...]` entries do not match.
 *
 * `plugin` is in the alternation because a denial can name either an indexer action
 * (`cluster:admin/content_manager/integration/create`) or a plugin action group
 * (`plugin:wazuh/ai_assistant/settings/write`), and an administrator grants them separately.
 */
const ACTION_SHAPE = /^(?:cluster|indices|plugin):[\w/*.-]+$/;

/** Recognizes the denial exception regardless of which wrapper carried it. */
const DENIAL_SHAPE = /no permissions for \[[^\]]/;

/** Captures the bracketed action list. Stops at the first `]`, ahead of the ` and User [...]` tail. */
const DENIED_ACTIONS = /no permissions for \[([^\]]*)\]/;

export const isPermissionDeniedMessage = (message: string): boolean => DENIAL_SHAPE.test(message);

/**
 * The fixed line, plus the denied action names when the message carries any.
 *
 * The action name is the remediation — an administrator cannot tell which grant is missing
 * without it — so it is the one piece kept. Everything else (username, backend roles, tenant,
 * exception type) is dropped: the only text taken from the message is a bracketed entry passing
 * {@link ACTION_SHAPE}.
 */
export const permissionDeniedMessage = (message: string): string => {
  const actions = [
    ...new Set(
      (DENIED_ACTIONS.exec(message)?.[1] ?? '')
        .split(',')
        .map((action) => action.trim())
        .filter((action) => ACTION_SHAPE.test(action))
    ),
  ];

  return actions.length > 0
    ? `${PERMISSION_DENIED_MESSAGE} Missing indexer permission: ${actions.join(', ')}.`
    : PERMISSION_DENIED_MESSAGE;
};

/**
 * Removes the identity block from a message that is not a denial — a 500 body can quote the same
 * `User [...]` tail. The pattern spans one level of nested brackets so it does not stop at the `]`
 * closing `backend_roles`. The rest of the message passes through: operators keep the operational
 * detail.
 */
export const redactIdentityDetail = (message: string): string =>
  message.replace(/User \[(?:[^[\]]|\[[^\]]*\])*\]/g, 'User [redacted]');

/**
 * Recognizes a denial by transport status rather than by wording, so a backend that rephrases its
 * exception still gets caught. Reads all four shapes because each hop exposes the status
 * differently: `statusCode` on an OpenSearch `ResponseError`, `meta.statusCode` on the client's
 * own wrapper, `body.status` on a parsed error body, and `response.status` on the
 * `IHttpFetchError` that `core.http` raises in the browser. Follows `cause` one level because a
 * service may rethrow a bare `Error` around the original.
 */
export const isPermissionDeniedStatus = (error: unknown): boolean => {
  const statusOf = (candidate: unknown): unknown => {
    const e = candidate as {
      statusCode?: unknown;
      meta?: { statusCode?: unknown };
      body?: { status?: unknown };
      response?: { status?: unknown };
    };
    return e?.statusCode ?? e?.meta?.statusCode ?? e?.body?.status ?? e?.response?.status;
  };

  return statusOf(error) === 403 || statusOf((error as { cause?: unknown })?.cause) === 403;
};

/**
 * Single entry point for both layers. `error` is the object the message was extracted from, when
 * the caller still has it.
 *
 * The wording is checked before the status so a recognized denial keeps its action name — the one
 * piece an administrator can act on. A 403 the wording does not recognize still yields the fixed
 * line, which is why the status is consulted at all: it is the durable signal, the wording is not.
 * Anything else keeps its text with the identity block redacted.
 */
export const sanitizeErrorMessage = (message: string, error?: unknown): string => {
  if (isPermissionDeniedMessage(message)) {
    return permissionDeniedMessage(message);
  }
  if (error !== undefined && isPermissionDeniedStatus(error)) {
    return PERMISSION_DENIED_MESSAGE;
  }
  return redactIdentityDetail(message);
};
