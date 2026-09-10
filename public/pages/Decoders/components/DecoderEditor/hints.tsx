/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';

/**
 * Hints for the decoder-specific fields: what the field is for, then an example.
 *
 * Examples come from the decoders the engine ships and are schema-checked by
 * hints.test. Parser syntax comes from the engine reference, not the schema.
 */

// Matches the filter form's example block: no fill, no border.
const preStyle: React.CSSProperties = { margin: '4px 0 0 0' };
const wrap: React.CSSProperties = { maxWidth: '600px' };

export const NAME_HINT =
  'Must follow the pattern decoder/<name>/<version> (e.g. decoder/zeek-stats/0)';

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
    Named values you can reuse elsewhere in the decoder. Most are lookup tables:
    <pre style={preStyle}>{`_log_level:\n  '3': error\n  '4': warning`}</pre>
    Read one with <code>get_key_in($_log_level, $_tmp.severity_string)</code>.
  </div>
);

export const NORMALIZE_HINT = (
  <div style={wrap}>
    Runs in order on every event this decoder accepts, so an entry can use fields an earlier one
    set. Each entry needs at least one parser or mapping.
  </div>
);
