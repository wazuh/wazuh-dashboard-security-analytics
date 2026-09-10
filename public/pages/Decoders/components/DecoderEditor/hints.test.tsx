/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount } from 'enzyme';
import Ajv from 'ajv';
import decoderSchema from '../../../../../common/schemas/wazuh-decoders.schema.json';
import {
  CHECK_EXPRESSION_HINT,
  CHECK_HINT,
  DEFINITIONS_HINT,
  MAP_HINT,
  NAME_HINT,
  NORMALIZE_CHECK_HINT,
  PARENTS_HINT,
  PARSE_HINT,
} from './hints';

/**
 * A hint that teaches the wrong syntax is worse than no hint, so every example is
 * checked against the engine schema rather than reviewed by eye. The examples
 * themselves are taken from the decoders the engine ships; see the file header.
 */

const ajv = new Ajv({ allErrors: true, strict: false, inlineRefs: false });
const validate = ajv.compile(decoderSchema as object);

const base = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  name: 'decoder/zeek-stats/0',
  enabled: true,
  metadata: {
    title: 'Zeek STATS logs decoder',
    author: 'Wazuh, Inc.',
    description: 'Zeek decoder for Zeek STATS logs.',
  },
};

const accept = (label: string, document: object) => {
  it(label, () => {
    const valid = validate(document);
    if (!valid) {
      const reasons = (validate.errors ?? [])
        .filter((error) => !['oneOf', 'anyOf', 'allOf'].includes(error.keyword))
        .map((error) => `${error.instancePath || '/'} ${error.message}`);
      throw new Error(`rejected by the engine schema:\n  ${[...new Set(reasons)].join('\n  ')}`);
    }
    expect(valid).toBe(true);
  });
};

describe('hint examples are accepted by the engine schema', () => {
  accept('name', { ...base });
  accept('parents', { ...base, parents: ['decoder/core-wazuh-message/0'] });
  accept('check, as an expression', { ...base, check: "$process.name == 'haproxy'" });
  accept('check, as a list', {
    ...base,
    check: [{ '_tmp_json.accountId': 'exists()' }, { '_tmp_json.id': 'exists()' }],
  });
  accept('check expression with operators', {
    ...base,
    check: "exists($_tmp_json.ts) AND $event.code == '4624'",
  });
  accept('check inside a normalize entry', {
    ...base,
    normalize: [{ check: 'exists($_tmp.session_id)', map: [{ 'event.kind': 'event' }] }],
  });
  accept('parser expression', {
    ...base,
    normalize: [{ 'parse|event.original': ['<_tmp.date/date/%y%m%d %T> <_tmp.message>'] }],
  });
  accept('map assignments', {
    ...base,
    normalize: [
      {
        map: [
          { 'event.category': 'array_append(network)' },
          { 'source.ip': '$_tmp_json.src_ip' },
          { 'event.kind': 'event' },
        ],
      },
    ],
  });
  accept('definitions lookup table', {
    ...base,
    definitions: { NSG_PROTO_MAP: { T: 'tcp', U: 'udp' } },
  });
});

describe('hint copy', () => {
  const textOf = (hint: React.ReactNode) => mount(<div>{hint}</div>).text();

  it('points at the parent shipped decoders actually use', () => {
    expect(PARENTS_HINT).toContain('decoder/core-wazuh-message/0');
  });

  it('shows the name pattern with a real decoder', () => {
    expect(NAME_HINT).toContain('decoder/<name>/<version>');
    expect(NAME_HINT).toContain('decoder/zeek-stats/0');
  });

  it('does not claim definitions names need a leading underscore', () => {
    // They do not: shipped decoders use log_level, PRIORITY, NSG_PROTO_MAP.
    expect(textOf(DEFINITIONS_HINT)).not.toMatch(/underscore/i);
  });

  it('explains the parser syntax rather than naming the format', () => {
    const text = textOf(PARSE_HINT);
    expect(text).not.toMatch(/logpar/i);
    expect(text).toContain('captures into that field');
  });

  it('shows both check shapes', () => {
    const text = textOf(CHECK_HINT);
    expect(text).toMatch(/expression/i);
    expect(text).toContain('exists()');
  });

  it('tells the user to quote string values', () => {
    expect(textOf(CHECK_EXPRESSION_HINT)).toMatch(/quote/i);
  });

  it('says a failing nested check skips only its own entry', () => {
    expect(textOf(NORMALIZE_CHECK_HINT)).toMatch(/skip the entry/i);
  });

  it('leads the map example with a helper, the most common value kind', () => {
    expect(textOf(MAP_HINT)).toContain('array_append(network)');
  });
});
