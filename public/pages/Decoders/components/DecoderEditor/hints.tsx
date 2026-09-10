/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';

/**
 * Field hints for the decoder-specific fields.
 *
 * Written to the shape the filter form uses for its `check` field: say what the
 * field is for, then show a worked example. Each hint renders directly beneath the
 * label of the field it describes, through `EuiFormHelpText` — never inside
 * `EuiText`, whose stylesheet paints `<pre>` with a code-block fill.
 *
 * **The examples are taken from the decoders the engine actually ships** (509 of
 * them in the standard space), not invented and not merely schema-valid. What that
 * survey changed:
 *
 * - `parents` is almost always `decoder/core-wazuh-message/0` (388 of 507 shipped
 *   decoders), not an integration.
 * - `definitions` names have **no** underscore rule — real ones are `log_level`,
 *   `PRIORITY`, `NSG_PROTO_MAP` — and their values are most often lookup maps
 *   (95 maps, 69 strings, 15 lists), not scalars.
 * - `map` values are helper calls more often than anything else (8,590 helpers vs
 *   6,294 field references and 4,963 literals), so the example leads with one.
 * - `check` lists in practice test for presence (`field: exists()`), rather than
 *   comparing against literals.
 * - string literals in a `check` expression are usually quoted (82 single-quoted,
 *   31 double, 11 bare).
 *
 * Parser syntax comes from the engine reference (Wazuh docs, Engine module,
 * "logpar"); the JSON Schema constrains an expression only to a non-empty string.
 */

// Matches the filter form's own example block: no fill, no border, just a small
// gap above it, so the example reads as part of the sentence.
const preStyle: React.CSSProperties = { margin: '4px 0 0 0' };
const wrap: React.CSSProperties = { maxWidth: '600px' };

export const NAME_HINT =
  'Must follow the pattern decoder/<name>/<version> (e.g. decoder/zeek-stats/0)';

export const PARENTS_HINT =
  'Decoders evaluated before this one. Most decoders extend decoder/core-wazuh-message/0.';

export const NORMALIZE_CHECK_HINT = (
  <div style={wrap}>
    Condition for this entry only. Events that fail it skip the entry and continue to the next one
    (e.g. <code>exists($_tmp.session_id)</code>).
  </div>
);

export const CHECK_EXPRESSION_HINT = (
  <div style={wrap}>
    Needs a field reference and an operator, or a helper call on its own. Quote string values, and
    combine with <code>AND</code>, <code>OR</code> and <code>NOT</code> — for example{' '}
    <code>exists($_tmp_json.ts) AND $event.code == &apos;4624&apos;</code>.
  </div>
);

export const CHECK_LIST_HINT = (
  <div style={wrap}>
    Every condition must pass, in order. Use a known field name, or start a custom name with an
    underscore. Shipped decoders mostly test for presence with <code>exists()</code>, but a literal
    or a field reference works too.
  </div>
);

export const PARSE_HINT = (
  <div style={wrap}>
    A pattern that matches the raw text of a field and captures parts of it into other fields. Text
    outside <code>&lt;&gt;</code> must match literally; <code>&lt;field.name&gt;</code> captures
    into that field, <code>&lt;~&gt;</code> matches without capturing, and <code>(?…)</code> marks a
    part optional. Each expression is tried in order until one matches:
    <pre style={preStyle}>{`<_tmp.date/date/%y%m%d %T> <_tmp.message>`}</pre>
  </div>
);

export const MAP_HINT = (
  <div style={wrap}>
    Assigns a value to a field. Use a known field name, or start a custom name with an underscore.
    The value can be a helper call, a reference to a field already set, or a literal:
    <pre
      style={preStyle}
    >{`- event.category: array_append(network)\n- source.ip: $_tmp_json.src_ip\n- event.kind: event`}</pre>
  </div>
);

export const DEFINITIONS_HINT = (
  <div style={wrap}>
    Constants expanded wherever they are referenced, resolved when the decoder is built rather than
    per event. Most are lookup tables:
    <pre style={preStyle}>{`NSG_PROTO_MAP:\n  T: tcp\n  U: udp`}</pre>
  </div>
);

export const NORMALIZE_HINT = (
  <div style={wrap}>
    Runs in order on every event this decoder accepts, so an entry can use fields an earlier one
    set. Each entry needs at least one parser or mapping.
  </div>
);
