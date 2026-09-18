/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { DocsLink, Example, InfoItem } from './components/LabelWithInfo';
import { CUSTOM_DECODERS_DOCUMENTATION_URL } from '../../../../utils/constants';

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

export const PARSE_HELP = 'Each parser reads one field and captures parts of it into other fields.';

export const PARSE_INFO = (
  <>
    <EuiText size="xs">
      <p>
        A parser expression reads one field from left to right, matching literal text and handing
        the parts between it to a parser.
      </p>
    </EuiText>
    <InfoItem term="Literal text">
      Text outside <code>&lt;&gt;</code> must match exactly. A literal <code>\</code>,{' '}
      <code>&lt;</code>, <code>&gt;</code>, <code>?</code> or <code>(</code> has to be escaped with
      a backslash.
    </InfoItem>
    <InfoItem term="&lt;field.name&gt;">
      Captures the next part of the value into that field. A field in the schema is read with the
      parser for its type; any other field is read as text.
    </InfoItem>
    <InfoItem term="&lt;field/parser/parameter&gt;">
      Chooses the parser and its parameters, as in <code>&lt;@timestamp/date/%Y-%m-%d %T&gt;</code>{' '}
      or <code>&lt;client.port/long&gt;</code>.
    </InfoItem>
    <InfoItem term="&lt;~&gt;">
      Matches without capturing. It takes a parser too, as in <code>&lt;~/long&gt;</code>.
    </InfoItem>
    <InfoItem term="&lt;?field&gt;">
      Makes that one field optional. When it does not match, the expression carries on.
    </InfoItem>
    <InfoItem term="&lt;a&gt;?&lt;b&gt;">
      A choice between two fields, of which one must match.
    </InfoItem>
    <InfoItem term="(?…)">
      An optional group. Everything inside it may be absent, and it cannot hold another group.
    </InfoItem>
    <InfoItem term="Where a part ends">
      A text capture runs up to the literal that follows it, or to the end of the value when nothing
      follows. Two captures in a row therefore need a literal between them.
    </InfoItem>
    <EuiText size="xs">
      <p>Expressions are tried in order until one matches.</p>
    </EuiText>
    <Example>{`[<@timestamp/%a %b %d %T %Y>] [<log.level>] [client <source.address>(?:<source.port>)] <message>`}</Example>
    <DocsLink href={CUSTOM_DECODERS_DOCUMENTATION_URL}>Custom decoder examples</DocsLink>
  </>
);

export const PARSE_FIELD_HELP = 'The field this parser reads.';

export const DEFINITIONS_HELP = 'Named values you can reuse elsewhere in the decoder.';

export const DEFINITIONS_INFO = (
  <>
    <EuiText size="xs">
      <p>A definition holds a single value or a lookup table, under a name of your choosing.</p>
    </EuiText>
    <Example caption="Definition">{`_log_level:\n  '3': error\n  '4': warning`}</Example>
    <EuiText size="xs">
      <p>
        Reference it by name, prefixed with <code>$</code>, anywhere the decoder takes a value — a
        check condition or a mapping.
      </p>
    </EuiText>
    <Example caption="Read in a normalize mapping">{`- log.level: get_key_in($_log_level, $_tmp.severity_string)`}</Example>
  </>
);
