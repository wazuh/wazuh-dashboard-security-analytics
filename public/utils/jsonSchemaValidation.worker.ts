/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import Ajv, { ValidateFunction } from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });

// postMessage clones the schema, so a WeakMap keyed by object identity never hits.
// Ajv's own getSchema(id) lookup is keyed by the schema's $id instead, which stays
// stable across clones.
function getValidator(schema: any): ValidateFunction {
  const id = schema?.$id;
  const existing = id ? ajv.getSchema(id) : undefined;
  if (existing) return existing;
  return ajv.compile(schema);
}

export interface ValidateRequest {
  id: number;
  schema: object;
  data: unknown;
}

export interface ValidateResponse {
  id: number;
  valid: boolean;
  errors: Ajv['errors'];
}

// Exported separately from the self.onmessage wiring below so it can be unit
// tested directly, without a real Worker/self context.
export function handleValidateRequest({ id, schema, data }: ValidateRequest): ValidateResponse {
  const validate = getValidator(schema);
  const valid = validate(data);
  return { id, valid, errors: valid ? null : validate.errors ?? null };
}

const ctx: Worker = self as any;

ctx.onmessage = (event: MessageEvent<ValidateRequest>) => {
  ctx.postMessage(handleValidateRequest(event.data));
};
