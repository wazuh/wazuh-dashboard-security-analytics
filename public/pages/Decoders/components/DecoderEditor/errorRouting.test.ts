/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  errorsUnder,
  humanizeMessage,
  nearestFormPath,
  pathSegments,
  routeSchemaErrors,
} from './errorRouting';
import { DecoderFormModel } from './DecoderEditorFormModel';
import { mapDecoderToForm } from './mappers';

const values: DecoderFormModel = mapDecoderToForm({
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  name: 'decoder/syslog/0',
  enabled: true,
  metadata: { title: '', author: 'Wazuh', description: 'Parses syslog events' },
  parents: ['decoder/integrations/0'],
  normalize: [
    { check: '$a == 1', map: [{ 'source.ip': '$ip' }] },
    { 'parse|event.original': ['<~>'] },
  ],
});

describe('pathSegments', () => {
  it('splits dots and brackets alike', () => {
    expect(pathSegments('normalize[2].map[0].source.ip')).toEqual([
      'normalize',
      '2',
      'map',
      '0',
      'source',
      'ip',
    ]);
  });
});

describe('nearestFormPath', () => {
  it('passes through a path that already resolves', () => {
    expect(nearestFormPath('metadata.title', values)).toBe('metadata.title');
  });

  it('walks a dotted ECS field name back to its row', () => {
    // The document key is `source.ip`; the form row is `{ field, value }`, so the
    // full path does not exist and the row has to take the error.
    expect(nearestFormPath('normalize[0].map[0].source.ip', values)).toBe('normalize[0].map[0]');
  });

  it('walks back to the section when the row index is out of range', () => {
    // `normalize[1].map` exists (it is empty), so the section takes the error —
    // attaching it to a row that is not on screen would hide it.
    expect(nearestFormPath('normalize[1].map[3].a.b', values)).toBe('normalize[1].map');
  });

  it('walks back to the entry when the section does not exist either', () => {
    expect(nearestFormPath('normalize[0].unknown[1].a', values)).toBe('normalize[0]');
  });

  it('returns an empty path for a key with nothing to land on', () => {
    expect(nearestFormPath('map_if', values)).toBe('');
  });

  it('does not mistake an index for an object key', () => {
    expect(nearestFormPath('parents.nope', values)).toBe('parents');
    expect(nearestFormPath('parents[0]', values)).toBe('parents[0]');
  });
});

describe('routeSchemaErrors', () => {
  it('routes field errors and collects the rest', () => {
    const routed = routeSchemaErrors(
      {
        'metadata.title': "'metadata.title' is required",
        'normalize[0].map[0].source.ip': "'source.ip' must be a string",
        map_if: "'map_if' is not a recognized field",
      },
      values
    );

    expect(routed.fields).toEqual({
      // Named the way the form labels it; see humanizeMessage.
      'metadata.title': 'Title is required',
      'normalize[0].map[0]': "'source.ip' must be a string",
    });
    expect(routed.document).toEqual(["'map_if' is not a recognized field"]);
  });

  it('keeps the first message when two errors collapse onto one row', () => {
    const routed = routeSchemaErrors(
      {
        'normalize[0].map[0].source.ip': 'first',
        'normalize[0].map[0].source.port': 'second',
      },
      values
    );
    expect(routed.fields['normalize[0].map[0]']).toBe('first');
  });

  it('lands a top-level parser error on its row instead of the summary', () => {
    const withParser = { ...values, parsers: [{ field: 'event.original', expressions: [] }] };
    const routed = routeSchemaErrors(
      { 'parse|event.original': "'parse|event.original' must NOT have fewer than 1 items" },
      withParser
    );

    expect(routed.fields).toEqual({
      'parsers[0]': 'Expressions must NOT have fewer than 1 items',
    });
    expect(routed.document).toEqual([]);
  });

  it('ignores non-string error values', () => {
    const routed = routeSchemaErrors({ normalize: ({} as unknown) as string }, values);
    expect(routed.fields).toEqual({});
    expect(routed.document).toEqual([]);
  });
});

describe('humanizeMessage', () => {
  it('names the field the way the form labels it', () => {
    // The sibling forms say "Title is required"; the schema says
    // "'metadata.title' is required". Same error, same words now.
    expect(humanizeMessage("'metadata.title' is required")).toBe('Title is required');
    expect(humanizeMessage("'metadata.author' is required")).toBe('Author is required');
    expect(humanizeMessage('\'name\' must match pattern "^decoder\\/"')).toBe(
      'Name must match pattern "^decoder\\/"'
    );
  });

  it('leaves paths inside normalize alone, since no field is named there', () => {
    // The path is how the user finds the problem in the YAML.
    const message = "'normalize[2].map' must NOT have fewer than 1 items";
    expect(humanizeMessage(message)).toBe(message);
  });

  it('leaves quoted text that is not a path alone', () => {
    const message = "'check' must match one of the valid formats: (1) 'a', (2) 'b'";
    expect(humanizeMessage(message)).toBe(
      "Check must match one of the valid formats: (1) 'a', (2) 'b'"
    );
  });

  it('rewrites every path in a message that names two', () => {
    expect(humanizeMessage("'metadata.title' is required when 'metadata.author' is present")).toBe(
      'Title is required when Author is present'
    );
  });
});

describe('errorsUnder', () => {
  const errors = {
    normalize: 'the array itself',
    'normalize[1].map': 'inside an entry',
    'normalize.weird': 'a dotted child',
    normalized: 'a different field that merely shares a prefix',
    'metadata.title': 'unrelated',
  };

  it('collects the field and everything inside it', () => {
    expect(errorsUnder(errors, 'normalize').sort()).toEqual(
      ['the array itself', 'inside an entry', 'a dotted child'].sort()
    );
  });

  it('returns nothing when the field is clean', () => {
    expect(errorsUnder(errors, 'check')).toEqual([]);
  });
});
