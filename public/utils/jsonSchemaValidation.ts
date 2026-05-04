import Ajv, { ErrorObject } from 'ajv';
import { FormikErrors } from 'formik';

const ajv = new Ajv({ allErrors: true, strict: false });

// Showing these top-level errors adds noise without helping the user fix anything.
const SKIP_KEYWORDS = new Set(['oneOf', 'anyOf', 'allOf', 'if', 'then', 'else']);

function normalizePath(error: ErrorObject): string {
  return error.instancePath.replace(/^\//, '').replace(/\//g, '.');
}

function fieldPath(error: ErrorObject): string {
  const raw = normalizePath(error);

  // These keywords report at the *parent* object level. The specific field is in params.
  switch (error.keyword) {
    case 'required':
      return join(raw, error.params?.missingProperty as string);
    case 'additionalProperties':
      return join(raw, error.params?.additionalProperty as string);
    case 'propertyNames':
      return join(raw, error.params?.propertyName as string);
    case 'dependencies':
    case 'dependentRequired':
      // The missing field is the actionable one; property is the trigger.
      return join(raw, error.params?.missingProperty as string);
    default:
      return raw || 'root';
  }
}

function join(parent: string, field: string): string {
  return parent ? `${parent}.${field}` : field;
}

function humanLabel(path: string): string {
  return path === 'root' ? 'value' : `'${path}'`;
}

function buildMessage(error: ErrorObject): string | null {
  if (SKIP_KEYWORDS.has(error.keyword)) return null;

  const path = fieldPath(error);
  const label = humanLabel(path);

  // These keywords report at the parent object level, so fieldPath already encodes
  // the specific field name in the key and label. Using Ajv's default message directly
  // would duplicate the field name (e.g. "'foo' should have required property 'foo'").
  // All other keywords fall through to the default which prepends the label to Ajv's message.
  switch (error.keyword) {
    case 'required':
      return `${label} is required`;
    case 'additionalProperties':
      return `${label} is not a recognized field`;
    case 'propertyNames':
      return `${label} is not a valid property name`;
    case 'dependencies':
    case 'dependentRequired': {
      const raw = normalizePath(error);
      const triggerLabel = humanLabel(join(raw, error.params?.property as string));
      return `${label} is required when ${triggerLabel} is present`;
    }
  }

  // For everything else Ajv's message is already readable, just prepend the field.
  const msg = error.message ?? 'is invalid';
  return path !== 'root' ? `${label} ${msg}` : msg;
}

interface ValidateOptions {
  skipRequired?: string[];
}

export function validateWithJsonSchema<T extends object>(
  schema: object,
  data: T,
  options?: ValidateOptions
): FormikErrors<T> {
  const validate = ajv.compile(schema);
  if (validate(data)) return {};

  const skipRequired = new Set(options?.skipRequired ?? []);
  const result: Record<string, string> = {};

  for (const error of validate.errors ?? []) {
    if (
      error.keyword === 'required' &&
      skipRequired.has(error.params?.missingProperty as string)
    ) {
      continue;
    }

    const message = buildMessage(error);
    if (!message) continue;

    const key = fieldPath(error);
    if (!result[key]) result[key] = message;
  }

  return result as FormikErrors<T>;
}
