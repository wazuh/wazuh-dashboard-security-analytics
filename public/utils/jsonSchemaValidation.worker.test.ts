/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { handleValidateRequest } from './jsonSchemaValidation.worker';

const schema = {
  $id: 'test-schema.json',
  type: 'object',
  properties: {
    name: { type: 'string' },
  },
  required: ['name'],
  additionalProperties: false,
};

describe('handleValidateRequest', () => {
  it('returns valid: true with no errors for valid data', () => {
    const response = handleValidateRequest({ id: 1, schema, data: { name: 'foo' } });
    expect(response).toEqual({ id: 1, valid: true, errors: null });
  });

  it('returns valid: false with Ajv errors for invalid data', () => {
    const response = handleValidateRequest({ id: 2, schema, data: {} });
    expect(response.valid).toBe(false);
    expect(response.errors?.[0].keyword).toBe('required');
  });

  it('handles repeated requests for the same schema without throwing', () => {
    // Regression test: postMessage clones the schema object on every call, so a
    // WeakMap keyed by object identity never hits and Ajv would otherwise throw
    // "schema with key or id ... already exists" on the second compile attempt.
    expect(() => {
      handleValidateRequest({ id: 3, schema, data: { name: 'a' } });
      handleValidateRequest({
        id: 4,
        schema: JSON.parse(JSON.stringify(schema)),
        data: { name: 'b' },
      });
    }).not.toThrow();
  });
});
