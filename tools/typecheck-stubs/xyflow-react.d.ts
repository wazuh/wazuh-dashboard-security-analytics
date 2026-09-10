/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Stub used only by tsconfig.typecheck.json.
 *
 * `@xyflow/react`'s shipped .d.ts uses syntax the parent checkout's TypeScript
 * (4.6.4) cannot parse. Those TS1005 errors suppress semantic diagnostics for the
 * entire program, so a typecheck that loads them silently reports nothing about our
 * own code — including undefined identifiers. Pointing the module at this stub
 * keeps the rest of the plugin genuinely checked.
 *
 * The cost is that calls into @xyflow/react are unchecked. That is a smaller hole
 * than the whole plugin being unchecked, which is the status quo.
 */
declare module '@xyflow/react' {
  const anything: any;
  export = anything;
}
