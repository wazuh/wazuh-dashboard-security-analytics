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
 * **Every claim below was checked against the engine schema with Ajv.** In
 * particular:
 *
 * - `map` and `check`-list *keys* are validated against the ECS field catalog:
 *   an unknown name is rejected unless it starts with `_`. This is the constraint
 *   users hit most, so it is stated on both fields.
 * - `map` *values* are **not** validated at all, so the hint is the only guidance
 *   the user gets — examples here must be ones the engine can actually resolve.
 * - `definitions` keys have no naming rule (an earlier version of this file
 *   claimed they need a leading underscore; they do not).
 * - a `check` expression needs a `$field` or helper *and* an operator, or must be
 *   a bare helper call — `$event.module` on its own is rejected.
 *
 * The parser syntax is taken from the engine reference (Wazuh docs, Engine module,
 * "logpar"), not from the JSON Schema, which constrains an expression only to a
 * non-empty string. The example below is the one the engine documentation gives
 * for an Apache error log, shortened.
 */

// Matches the filter form's own example block: no fill, no border, just a small
// gap above it, so the example reads as part of the sentence.
const preStyle: React.CSSProperties = { margin: '4px 0 0 0' };
const wrap: React.CSSProperties = { maxWidth: '600px' };

export const NAME_HINT = 'Must follow the pattern decoder/<name>/<version> (e.g. decoder/syslog/0)';

export const PARENTS_HINT = 'Decoders evaluated before this one (e.g. decoder/integrations/0)';

export const CHECK_HINT = (
  <div style={wrap}>
    Expression evaluated to determine if the decoder applies (e.g.{' '}
    <code>$event.module == syslog</code>) or a list of field/value pairs:
    <pre style={preStyle}>{`- event.module: syslog\n- host.os.type: linux`}</pre>
  </div>
);

export const NORMALIZE_CHECK_HINT = (
  <div style={wrap}>
    Condition for this entry only. Events that fail it skip the entry and continue to the next one
    (e.g. <code>$event.action == login</code>).
  </div>
);

export const CHECK_EXPRESSION_HINT = (
  <div style={wrap}>
    Needs a field reference and an operator, or a helper call on its own. Combine with{' '}
    <code>AND</code>, <code>OR</code> and <code>NOT</code> — for example{' '}
    <code>$event.module == syslog AND NOT $error.code</code>, or <code>exists($event.module)</code>.
  </div>
);

export const CHECK_LIST_HINT = (
  <div style={wrap}>
    Every condition must pass, in order. The field must be a known field name, or a custom one
    starting with <code>_</code>. The value can be a literal, a reference to another field, or a
    helper call.
  </div>
);

export const PARSE_HINT = (
  <div style={wrap}>
    A pattern that matches the raw text of a field and captures parts of it into other fields. Text
    outside <code>&lt;&gt;</code> must match literally; <code>&lt;field.name&gt;</code> captures
    into that field, <code>&lt;~&gt;</code> matches without capturing, and <code>(?…)</code> marks a
    part optional. Each expression is tried in order until one matches:
    <pre
      style={preStyle}
    >{`[<@timestamp>] [<log.level>] [client <source.address>(?:<source.port>)] <message>`}</pre>
  </div>
);

export const MAP_HINT = (
  <div style={wrap}>
    Assigns a value to a field. The field must be a known field name, or a custom one starting with{' '}
    <code>_</code>. The value can be a literal, a reference to a field already set, or a helper
    call:
    <pre
      style={preStyle}
    >{`- event.kind: event\n- source.ip: $_parsed_ip\n- event.created: get_date()`}</pre>
  </div>
);

export const DEFINITIONS_HINT = (
  <div style={wrap}>
    Constants expanded wherever they are referenced, resolved when the decoder is built rather than
    per event:
    <pre style={preStyle}>{`_threshold: 5\n_vendor: wazuh`}</pre>
  </div>
);

export const NORMALIZE_HINT = (
  <div style={wrap}>
    Runs in order on every event this decoder accepts, so an entry can use fields an earlier one
    set. Each entry needs at least one parser or mapping.
  </div>
);
