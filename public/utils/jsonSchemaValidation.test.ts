/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  private callCount = 0;

  postMessage(request: { id: number; schema: any; data: any }) {
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

import { validateWithJsonSchemaAsync } from './jsonSchemaValidation';

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
