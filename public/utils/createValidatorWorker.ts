/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// Isolated so tests can mock this one line instead of needing Jest/Babel to
// parse `import.meta.url`
export function createValidatorWorker(): Worker {
  return new Worker(new URL('./jsonSchemaValidation.worker.ts', import.meta.url));
}
