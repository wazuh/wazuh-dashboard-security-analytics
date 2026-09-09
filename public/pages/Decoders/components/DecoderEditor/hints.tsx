/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';

/**
 * Field hints for the decoder-specific fields.
 *
 * Written to the shape the filter form uses for its `check` field: say what the
 * field is for, then show a real example inline — a reader should not have to know
 * the decoder document by heart to fill one in.
 *
 * Each hint renders directly beneath the label of the field it describes, never at
 * the bottom of a list: a hint that has scrolled away from its field explains
 * nothing.
 */

// Matches the filter form's own example block exactly: no fill, no border, just a
// small gap above it. The example should read as part of the hint, not as a panel.
const preStyle: React.CSSProperties = { margin: '4px 0 0 0' };

const wrap: React.CSSProperties = { maxWidth: '600px' };

export const NAME_HINT = 'Must follow the pattern decoder/<name>/<version> (e.g. decoder/syslog/0)';

export const CHECK_HINT = (
  <div style={wrap}>
    Expression evaluated to determine if the decoder applies (e.g.{' '}
    <code>$event.module == syslog</code>) or a list of field/value pairs:
    <pre style={preStyle}>{`- event.module: syslog\n- host.os.type: linux`}</pre>
  </div>
);

export const NORMALIZE_CHECK_HINT = (
  <div style={wrap}>
    Optional condition for this entry only. Events that fail it skip this entry and continue to the
    next one (e.g. <code>$event.action == login</code>).
  </div>
);

export const PARSE_HINT = (
  <div style={wrap}>
    Reads one field and extracts values from it. The field is the one being parsed (e.g.{' '}
    <code>message</code>), and each expression is tried in order until one succeeds:
    <pre style={preStyle}>{`parse|message:\n  - <~timestamp/RFC3339> <~host> <~message>`}</pre>
  </div>
);

export const MAP_HINT = (
  <div style={wrap}>
    Assigns a value to a field. The value can be a literal, a reference to another field, or a
    helper call:
    <pre
      style={preStyle}
    >{`- event.kind: event\n- source.ip: $parsed.ip\n- event.created: get_date()`}</pre>
  </div>
);

export const DEFINITIONS_HINT = (
  <div style={wrap}>
    Build-time typed macros, expanded wherever they are referenced. Names start with an underscore:
    <pre style={preStyle}>{`_threshold: 5\n_vendor: "wazuh"`}</pre>
  </div>
);

export const NORMALIZE_HINT = (
  <div style={wrap}>
    Sequential sub-stages. Each entry runs in order on every event that reaches it, so a later entry
    can use fields an earlier one set.
  </div>
);

export const PARENTS_HINT =
  'Parent decoders evaluated before this one (e.g. decoder/integrations/0)';
