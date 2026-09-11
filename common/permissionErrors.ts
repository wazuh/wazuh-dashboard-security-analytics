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

/** Fixed opening line for every authorization denial. */
export const PERMISSION_DENIED_MESSAGE =
  'You do not have permission to perform this action. Contact your administrator.';

/**
 * Guards what {@link permissionDeniedMessage} is allowed to quote back: an action name, nothing
 * else. The identity block's `name=...` and `backend_roles=[...]` entries do not match.
 */
const ACTION_SHAPE = /^(?:cluster|indices):[\w/*.-]+$/;

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
    ? `${PERMISSION_DENIED_MESSAGE} Missing permission: ${actions.join(', ')}.`
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
 * Single entry point for both layers: a denial becomes plain-language copy, anything else keeps
 * its text with the identity block redacted.
 */
export const sanitizeErrorMessage = (message: string): string =>
  isPermissionDeniedMessage(message)
    ? permissionDeniedMessage(message)
    : redactIdentityDetail(message);
