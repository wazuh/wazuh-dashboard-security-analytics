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
  CHECK_LIST_HINT,
  DEFINITIONS_HINT,
  MAP_HINT,
  NAME_HINT,
  PARENTS_HINT,
  PARSE_HINT,
} from './hints';

/** Examples are schema-checked rather than reviewed by eye. */

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
  accept('definitions lookup table, and the helper that reads it', {
    ...base,
    definitions: { _log_level: { '3': 'error', '4': 'warning' } },
    normalize: [{ map: [{ 'log.level': 'get_key_in($_log_level, $_tmp.severity_string)' }] }],
  });
});

describe('placeholders', () => {
  const read = (file: string) =>
    require('fs').readFileSync(`${__dirname}/${file}`, 'utf8') as string;

  it('keeps shared metadata fields generic, as the sibling forms do', () => {
    // Title, author, description, documentation and references appear on the KVDB
    // and filter forms too; they must not read as decoder trivia.
    const metadata = read('components/MetadataFields.tsx');
    [
      'Enter decoder title',
      'Enter author name',
      'Brief description of what this decoder does',
      'Enter documentation',
      'https://example.com/reference',
    ].forEach((text) => expect(metadata).toContain(text));
  });

  it('keeps decoder-specific fields concrete', () => {
    // No counterpart on another form, so a real value teaches more.
    expect(read('DecoderEditorForm.tsx')).toContain('decoder/core-wazuh-message/0');
    expect(read('components/CheckEditor.tsx')).toContain("$process.name == 'haproxy'");
  });
});

describe('hint copy', () => {
  const textOf = (hint: React.ReactNode) => mount(<div>{hint}</div>).text();

  const HINTS: Array<[string, React.ReactNode]> = [
    ['NAME_HINT', NAME_HINT],
    ['PARENTS_HINT', PARENTS_HINT],
    ['CHECK_EXPRESSION_HINT', CHECK_EXPRESSION_HINT],
    ['CHECK_LIST_HINT', CHECK_LIST_HINT],
    ['PARSE_HINT', PARSE_HINT],
    ['MAP_HINT', MAP_HINT],
    ['DEFINITIONS_HINT', DEFINITIONS_HINT],
  ];

  it.each(HINTS)('%s does not strand punctuation after a code token', (_name, hint) => {
    // `<code>- </code>.` renders as "- ." and reads like a typo.
    const text = typeof hint === 'string' ? hint : textOf(hint);
    expect(text.split('\n')[0]).not.toMatch(/\s[.,;]/);
  });

  it('points at the parent shipped decoders actually use', () => {
    expect(PARENTS_HINT).toContain('decoder/core-wazuh-message/0');
  });

  it('does not claim definitions names need a leading underscore', () => {
    // They do not: shipped decoders use log_level, PRIORITY, NSG_PROTO_MAP.
    expect(textOf(DEFINITIONS_HINT)).not.toMatch(/must .{0,20}underscore/i);
  });

  it('shows a recurring definition and the helper that reads it', () => {
    // NSG_PROTO_MAP appeared in 1 of 509; a definition is pointless without its lookup.
    const text = textOf(DEFINITIONS_HINT);
    expect(text).toContain('_log_level');
    expect(text).toContain('get_key_in($_log_level, $_tmp.severity_string)');
    expect(text).not.toContain('NSG_PROTO_MAP');
  });

  it('explains the parser syntax rather than naming the format', () => {
    const text = textOf(PARSE_HINT);
    expect(text).not.toMatch(/logpar/i);
    expect(text).toContain('captures into that field');
  });
});
