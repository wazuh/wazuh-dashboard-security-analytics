import Ajv, { ErrorObject } from 'ajv';
import { FormikErrors } from 'formik';

const ajv = new Ajv({ allErrors: true, strict: false });

// Showing these top-level errors adds noise without helping the user fix anything.
const SKIP_KEYWORDS = new Set(['oneOf', 'anyOf', 'allOf', 'if', 'then', 'else']);

function normalizePath(error: ErrorObject): string {
  return error.instancePath
    .replace(/^\//, '')
    .split('/')
    .map(seg => (/^\d+$/.test(seg) ? `[${seg}]` : seg))
    .join('.')
    .replace(/\.\[/g, '[');
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

const MAX_LABEL_LENGTH = 60;

function humanLabel(path: string): string {
  if (path === 'root') return 'value';
  const display = path.length > MAX_LABEL_LENGTH ? path.slice(0, MAX_LABEL_LENGTH - 3) + '...' : path;
  return `'${display}'`;
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
  const resultKeywords: Record<string, string> = {};

  for (const error of validate.errors ?? []) {
    if (error.keyword === 'required' && skipRequired.has(error.params?.missingProperty as string)) continue;

    const message = buildMessage(error);
    if (!message) continue;

    const key = fieldPath(error);
    if (!result[key]) {
      result[key] = message;
      resultKeywords[key] = error.keyword;
    }
  }

  return suppressErrors(result, resultKeywords) as FormikErrors<T>;
}

function parentPath(key: string): string {
  const lastSep = Math.max(key.lastIndexOf('.'), key.lastIndexOf('['));
  return lastSep > 0 ? key.slice(0, lastSep) : '';
}

function pathDepth(key: string): number {
  return (key.match(/\.|\[/g) ?? []).length;
}

function suppressErrors(
  result: Record<string, string>,
  keywords: Record<string, string>
): Record<string, string> {
  const keys = Object.keys(result);
  return Object.fromEntries(
    Object.entries(result).filter(([key]) => {
      // Drop parent level errors when more specific child errors exist to avoid noise.
      if (keys.some(other => other !== key && (other.startsWith(key + '.') || other.startsWith(key + '[')))) {
        return false;
      }
      if (keywords[key] === 'additionalProperties') {
        const parent = parentPath(key);
        const depth = pathDepth(key);
        // A same-level sibling with a substantive error means this branch lost the oneOf race.
        const hasSiblingSubstantiveError = keys.some(
          other => other !== key && parentPath(other) === parent && keywords[other] !== 'additionalProperties'
        );
        // A deeper error under the same parent item means validation reached further into the
        // intended branch before failing, shallow additionalProperties are from losing branches.
        const hasDeeperError = keys.some(
          other => other !== key &&
            (other.startsWith(parent + '.') || other.startsWith(parent + '[')) &&
            pathDepth(other) > depth
        );
        if (hasSiblingSubstantiveError || hasDeeperError) return false;
      }
      return true;
    })
  );
}
