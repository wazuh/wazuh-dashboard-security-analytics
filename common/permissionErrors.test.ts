/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  PERMISSION_DENIED_MESSAGE,
  isPermissionDeniedMessage,
  permissionDeniedMessage,
  redactIdentityDetail,
  sanitizeErrorMessage,
} from './permissionErrors';

const DENIAL =
  'no permissions for [cluster:admin/content_manager/integration/create] and ' +
  'User [name=wazuh-readonly, backend_roles=[], requestedTenant=null]';

describe('isPermissionDeniedMessage', () => {
  it('recognizes the content manager denial', () => {
    expect(isPermissionDeniedMessage(DENIAL)).toBe(true);
  });

  it('does not match an empty action list', () => {
    expect(isPermissionDeniedMessage('no permissions for []')).toBe(false);
  });

  it('does not match an unrelated message', () => {
    expect(isPermissionDeniedMessage('Event exceeds the maximum allowed size.')).toBe(false);
  });
});

describe('permissionDeniedMessage', () => {
  it('keeps the denied action and drops the identity block', () => {
    const message = permissionDeniedMessage(DENIAL);

    expect(message).toBe(
      `${PERMISSION_DENIED_MESSAGE} Missing permission: cluster:admin/content_manager/integration/create.`
    );
    expect(message).not.toContain('wazuh-readonly');
    expect(message).not.toContain('backend_roles');
    expect(message).not.toContain('requestedTenant');
  });

  it('lists every denied action once', () => {
    expect(
      permissionDeniedMessage(
        'no permissions for [cluster:admin/content_manager/integration/create, ' +
          'indices:data/write/index, cluster:admin/content_manager/integration/create] and ' +
          'User [name=qauser]'
      )
    ).toBe(
      `${PERMISSION_DENIED_MESSAGE} Missing permission: ` +
        'cluster:admin/content_manager/integration/create, indices:data/write/index.'
    );
  });

  it.each([
    'no permissions for [] and User [name=qauser]',
    'no permissions for [name=qauser, backend_roles=[readall]]',
    'no permissions for [DROP TABLE users]',
  ])('falls back to the fixed line when nothing looks like an action: %s', (raw) => {
    expect(permissionDeniedMessage(raw)).toBe(PERMISSION_DENIED_MESSAGE);
  });
});

describe('redactIdentityDetail', () => {
  it('redacts the identity block including its nested brackets', () => {
    expect(
      redactIdentityDetail(
        'index_create failed for User [name=wazuh-readonly, backend_roles=[readall], ' +
          'requestedTenant=null] on content index'
      )
    ).toBe('index_create failed for User [redacted] on content index');
  });

  it('leaves a message without an identity block untouched', () => {
    expect(redactIdentityDetail('Integration title already exists.')).toBe(
      'Integration title already exists.'
    );
  });
});

describe('sanitizeErrorMessage', () => {
  it('turns a denial into plain-language copy', () => {
    expect(sanitizeErrorMessage(DENIAL)).toBe(
      `${PERMISSION_DENIED_MESSAGE} Missing permission: cluster:admin/content_manager/integration/create.`
    );
  });

  it('keeps the operational detail of a non-denial and redacts only the identity', () => {
    expect(sanitizeErrorMessage('Shard failure for User [name=qauser, backend_roles=[]]')).toBe(
      'Shard failure for User [redacted]'
    );
  });

  it('is idempotent, so sanitizing on both layers does not double-wrap', () => {
    const once = sanitizeErrorMessage(DENIAL);

    expect(sanitizeErrorMessage(once)).toBe(once);
  });
});
