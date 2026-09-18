/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EuiSearchBar } from '@elastic/eui';
import {
  buildStatusIntegrationFilters,
  classifyEntitySearchError,
  ENTITY_FILTER_SELECTORS_LABEL,
  ENTITY_SEARCH_SCHEMA,
  getOrSelectedValues,
  hasTypedFieldClause,
} from './entitySearchBarFilters';
import { IntegrationOption } from '../components/IntegrationComboBox/useIntegrationSelector';

// Wazuh: #502 left rules declaring three filter fields while the copy named two
// selectors. One selector named per declared field.
const namedSelectors = (label: string): string[] =>
  label
    .split(/,| and /)
    .map((part) => part.trim())
    .filter(Boolean);

describe('buildStatusIntegrationFilters', () => {
  const integrationOptions: IntegrationOption[] = [
    { value: 'aws', label: 'AWS' } as IntegrationOption,
    { value: 'azure', label: 'Azure' } as IntegrationOption,
  ];

  it('produces byte-for-byte identical output to the pre-parameterization implementation when called without overrides (Rules/Decoders/KVDBs call sites)', () => {
    expect(buildStatusIntegrationFilters(integrationOptions, false)).toEqual([
      {
        type: 'field_value_selection',
        field: 'status',
        name: 'Status',
        compressed: true,
        multiSelect: 'or',
        operator: 'exact',
        options: [
          { value: 'enabled', name: 'Enabled' },
          { value: 'disabled', name: 'Disabled' },
        ],
      },
      {
        type: 'field_value_selection',
        field: 'integration',
        name: 'Integration',
        compressed: true,
        multiSelect: 'or',
        operator: 'exact',
        loading: false,
        options: [
          { value: 'aws', name: 'AWS' },
          { value: 'azure', name: 'Azure' },
        ],
      },
    ]);
  });

  it('propagates the loading flag unchanged', () => {
    const filters = buildStatusIntegrationFilters(integrationOptions, true);
    expect(filters[1].loading).toBe(true);
  });

  it('honors overrides: custom integration field and explicit integration options supersede integrationOptions', () => {
    const filters = buildStatusIntegrationFilters([], false, {
      integrationField: 'logType',
      integrationFilterOptions: [{ value: 'windows', name: 'Windows' }],
    });

    expect(filters[1]).toMatchObject({
      field: 'logType',
      name: 'Integration',
      options: [{ value: 'windows', name: 'Windows' }],
      multiSelect: 'or',
      operator: 'exact',
      compressed: true,
    });
  });

  it('honors a custom statusOptions override without leaking the default Enabled/Disabled pair', () => {
    const filters = buildStatusIntegrationFilters([], false, {
      statusOptions: [
        { value: 'active', name: 'Active' },
        { value: 'inactive', name: 'Inactive' },
      ],
    });

    expect(filters[0].options).toEqual([
      { value: 'active', name: 'Active' },
      { value: 'inactive', name: 'Inactive' },
    ]);
  });
});

describe('ENTITY_SEARCH_SCHEMA', () => {
  it('is strict and declares exactly status/integration as string fields', () => {
    expect(ENTITY_SEARCH_SCHEMA).toEqual({
      strict: true,
      fields: {
        status: { type: 'string' },
        integration: { type: 'string' },
      },
    });
  });
});

describe('ENTITY_FILTER_SELECTORS_LABEL', () => {
  it('names one selector per field the shared schema declares', () => {
    expect(namedSelectors(ENTITY_FILTER_SELECTORS_LABEL)).toHaveLength(
      Object.keys(ENTITY_SEARCH_SCHEMA.fields).length
    );
  });
});

describe('getOrSelectedValues', () => {
  const parse = (text: string) => EuiSearchBar.Query.parse(text);

  it('reads the parenthesized form the filter popover writes', () => {
    expect(getOrSelectedValues(parse('integration:(auditd)'), 'integration')).toEqual(['auditd']);
    expect(getOrSelectedValues(parse('integration:(auditd or apache)'), 'integration')).toEqual([
      'auditd',
      'apache',
    ]);
  });

  it('reads a hand-typed scalar clause, which used to be dropped without a word', () => {
    expect(getOrSelectedValues(parse('level:high'), 'level')).toEqual(['high']);
    expect(getOrSelectedValues(parse('integration:auditd'), 'integration')).toEqual(['auditd']);
  });

  it('gives the typed and the clicked form the same meaning', () => {
    expect(getOrSelectedValues(parse('level:high'), 'level')).toEqual(
      getOrSelectedValues(parse('level:(high)'), 'level')
    );
  });

  it('collects every clause when a field is typed more than once', () => {
    expect(getOrSelectedValues(parse('level:high level:low'), 'level')).toEqual(['high', 'low']);
  });

  it('ignores a negated clause, which excludes a value instead of selecting it', () => {
    expect(getOrSelectedValues(parse('-level:high'), 'level')).toEqual([]);
  });

  it('stringifies the booleans EUI casts bare true/false into', () => {
    expect(getOrSelectedValues(parse('status:true'), 'status')).toEqual(['true']);
  });

  it('returns nothing for a field the query does not mention', () => {
    expect(getOrSelectedValues(parse('some free text'), 'level')).toEqual([]);
    expect(getOrSelectedValues(parse(''), 'integration')).toEqual([]);
  });
});

describe('classifyEntitySearchError', () => {
  it('names the fields the strict schema does not declare', () => {
    expect(classifyEntitySearchError('document.id:add4b6ba', ENTITY_SEARCH_SCHEMA)).toEqual({
      kind: 'unknown_field',
      fields: ['document.id'],
    });
  });

  it('names every unknown field and skips the declared ones', () => {
    expect(
      classifyEntitySearchError('status:enabled author:wazuh title:x', ENTITY_SEARCH_SCHEMA)
    ).toEqual({ kind: 'unknown_field', fields: ['author', 'title'] });
  });

  it('classifies a grammar error as syntax, even when it mentions a declared field', () => {
    expect(classifyEntitySearchError('level=(or critical)', ENTITY_SEARCH_SCHEMA)).toEqual({
      kind: 'syntax',
    });
    expect(classifyEntitySearchError('status:"unbalanced', ENTITY_SEARCH_SCHEMA)).toEqual({
      kind: 'syntax',
    });
  });

  it('treats a schema with an extra field as declared', () => {
    const rulesSchema = { fields: { ...ENTITY_SEARCH_SCHEMA.fields, level: { type: 'string' } } };
    expect(classifyEntitySearchError('level:high', rulesSchema)).toEqual({ kind: 'syntax' });
    expect(classifyEntitySearchError('level:high', ENTITY_SEARCH_SCHEMA)).toEqual({
      kind: 'unknown_field',
      fields: ['level'],
    });
  });

  it('classifies empty or free text as syntax, with nothing to guide on', () => {
    expect(classifyEntitySearchError('', ENTITY_SEARCH_SCHEMA)).toEqual({ kind: 'syntax' });
    expect(classifyEntitySearchError('plain words', ENTITY_SEARCH_SCHEMA)).toEqual({
      kind: 'syntax',
    });
  });
});

describe('hasTypedFieldClause', () => {
  const parse = (text: string) => EuiSearchBar.Query.parse(text);
  const FIELDS = ['status', 'integration'];

  it('is true for a typed scalar clause', () => {
    expect(hasTypedFieldClause(parse('integration:wazuh'), FIELDS)).toBe(true);
  });

  it('is false for the parenthesized clause the popover writes', () => {
    expect(hasTypedFieldClause(parse('integration:(wazuh)'), FIELDS)).toBe(false);
    expect(hasTypedFieldClause(parse('integration:(a or b)'), FIELDS)).toBe(false);
  });

  it('is true when a typed clause sits next to a popover clause', () => {
    expect(hasTypedFieldClause(parse('status:(enabled) integration:wazuh'), FIELDS)).toBe(true);
  });

  it('ignores fields outside the list and free text', () => {
    expect(hasTypedFieldClause(parse('level:high plain words'), FIELDS)).toBe(false);
    expect(hasTypedFieldClause(parse(''), FIELDS)).toBe(false);
  });
});
