/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { Example, InfoItem } from './components/LabelWithInfo';

/**
 * Copy for the decoder-specific fields.
 *
 * `*_HELP` is the one sentence under the control; `*_INFO` is the reference
 * material behind the label's info button — what the parts mean, then a worked
 * example. Examples are schema-checked by hints.test.
 */

export const NAME_HELP = 'Must follow the pattern decoder/<name>/<version>';

export const PARENTS_INFO = (
  <EuiText size="xs">
    <p>Decoders evaluated before this one. This decoder only runs on events a parent accepted.</p>
  </EuiText>
);

export const CHECK_EXPRESSION_HELP =
  'Needs a field reference and an operator, or a helper call on its own.';

export const CHECK_EXPRESSION_INFO = (
  <>
    <InfoItem term="Values">Quote string values.</InfoItem>
    <InfoItem term="Operators">
      Combine conditions with <code>AND</code>, <code>OR</code> and <code>NOT</code>.
    </InfoItem>
    <Example>{`exists($_tmp_json.ts) AND $event.code == '4624'`}</Example>
  </>
);

export const CHECK_LIST_HELP = 'Every condition must pass, in order.';

export const PARSE_HELP =
  'A pattern that matches the raw text of a field and captures parts of it into other fields.';

export const PARSE_INFO = (
  <>
    <InfoItem term="Literal text">Text outside &lt;&gt; must match exactly.</InfoItem>
    <InfoItem term="&lt;field.name&gt;">Captures into that field.</InfoItem>
    <InfoItem term="&lt;~&gt;">Matches without capturing.</InfoItem>
    <InfoItem term="(?…)">Marks a part optional.</InfoItem>
    <EuiText size="xs">
      <p>Expressions are tried in order until one matches.</p>
    </EuiText>
    <Example>{`<_tmp.date/date/%y%m%d %T> <_tmp.message>`}</Example>
  </>
);

export const PARSE_FIELD_HELP = 'The field this parser reads.';

export const DEFINITIONS_HELP = 'Named values you can reuse elsewhere in the decoder.';

export const DEFINITIONS_INFO = (
  <>
    <EuiText size="xs">
      <p>A definition can be a single value or a lookup table.</p>
    </EuiText>
    <Example>{`_log_level:\n  '3': error\n  '4': warning`}</Example>
    <EuiText size="xs">
      <p>
        Read one with <code>get_key_in($_log_level, $_tmp.severity_string)</code>.
      </p>
    </EuiText>
  </>
);
