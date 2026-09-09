/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// Every request the worker was handed, so tests can assert on the *protocol*
// (which requests carried the schema) and not only on the results.
const sentRequests: Array<{ id: number; schema?: any; schemaId?: string; data: any }> = [];

// When set, the next request naming a schemaId is answered as if the worker had
// never been given that schema.
let forgetNextSchemaId = false;

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  private callCount = 0;

  postMessage(request: { id: number; schema?: any; schemaId?: string; data: any }) {
    sentRequests.push(request);

    if (request.schemaId && forgetNextSchemaId) {
      forgetNextSchemaId = false;
      setTimeout(() => {
        this.onmessage?.({
          data: { id: request.id, valid: false, errors: null, unknownSchema: true },
        } as MessageEvent);
      }, 0);
      return;
    }

    // The first call of each test responds later than the second, so responses
    // arrive out of order relative to when postMessage was called, exercising
    // the id-based multiplexing in validateWithJsonSchemaAsync.
    const delay = this.callCount % 2 === 0 ? 20 : 0;
    this.callCount++;
    setTimeout(() => {
      const valid = request.data?.name !== undefined;
      this.onmessage?.({
        data: {
          id: request.id,
          valid,
          errors: valid
            ? null
            : [
                {
                  instancePath: '',
                  keyword: 'required',
                  params: { missingProperty: 'name' },
                  message: "must have required property 'name'",
                },
              ],
        },
      } as MessageEvent);
    }, delay);
  }
}

jest.mock('./createValidatorWorker', () => ({
  createValidatorWorker: () => new MockWorker(),
}));

import {
  resetRegisteredSchemasForTesting,
  validateWithJsonSchemaAsync,
} from './jsonSchemaValidation';

const schema = {
  $id: 'test.json',
  type: 'object',
  properties: { name: { type: 'string' } },
  required: ['name'],
};

describe('validateWithJsonSchemaAsync', () => {
  it('resolves to {} for valid data', async () => {
    const errors = await validateWithJsonSchemaAsync(schema, { name: 'foo' });
    expect(errors).toEqual({});
  });

  it('resolves to formatted errors for invalid data', async () => {
    const errors = await validateWithJsonSchemaAsync(schema, {});
    expect(errors).toEqual({ name: "'name' is required" });
  });

  it('resolves concurrent calls to their own result, regardless of response order', async () => {
    // request id 1 is delayed longer than id 2 by the mock above, so the
    // responses arrive out of order; each promise must still resolve correctly.
    const [first, second] = await Promise.all([
      validateWithJsonSchemaAsync(schema, {}),
      validateWithJsonSchemaAsync(schema, { name: 'bar' }),
    ]);
    expect(first).toEqual({ name: "'name' is required" });
    expect(second).toEqual({});
  });
});

describe('schema registration', () => {
  beforeEach(() => {
    sentRequests.length = 0;
    forgetNextSchemaId = false;
    resetRegisteredSchemasForTesting();
  });

  it('sends the schema once and then only its $id', async () => {
    // postMessage structured-clones whatever it is handed. The decoder schema is
    // ~2.4 MB, so a form that validates as the user types must not re-send it.
    await validateWithJsonSchemaAsync(schema, { name: 'a' });
    await validateWithJsonSchemaAsync(schema, { name: 'b' });
    await validateWithJsonSchemaAsync(schema, { name: 'c' });

    expect(sentRequests.filter((request) => request.schema !== undefined)).toHaveLength(1);
    expect(sentRequests.slice(1).every((request) => request.schemaId === schema.$id)).toBe(true);
  });

  it('always sends a schema that has no $id, since it cannot be looked up', async () => {
    const anonymous = { type: 'object', properties: { name: { type: 'string' } } };
    await validateWithJsonSchemaAsync(anonymous, { name: 'a' });
    await validateWithJsonSchemaAsync(anonymous, { name: 'b' });

    expect(sentRequests.every((request) => request.schema !== undefined)).toBe(true);
  });

  it('re-sends the schema when the worker no longer has it', async () => {
    await validateWithJsonSchemaAsync(schema, { name: 'a' });
    sentRequests.length = 0;
    forgetNextSchemaId = true;

    const errors = await validateWithJsonSchemaAsync(schema, { name: 'b' });

    expect(sentRequests).toHaveLength(2);
    expect(sentRequests[0].schema).toBeUndefined();
    expect(sentRequests[1].schema).toBeDefined();
    expect(errors).toEqual({});
  });
});
