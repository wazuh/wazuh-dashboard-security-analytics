/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EntitySearchErrorCallOut } from './EntitySearchErrorCallOut';
import {
  RULES_FILTER_SELECTORS_LABEL,
  RULES_SEARCHABLE_FIELDS_LABEL,
} from '../../pages/WazuhRules/utils/constants';
import { DECODERS_SEARCHABLE_FIELDS_LABEL } from '../../pages/Decoders/utils/constants';
import { KVDBS_SEARCHABLE_FIELDS_LABEL } from '../../pages/KVDBs/utils/constants';
import { ENTITY_SEARCH_SCHEMA } from '../../utils/entitySearchBarFilters';

const UNKNOWN_FIELD = { message: 'Unknown field `document.id`', queryText: 'document.id:abc' };

describe('EntitySearchErrorCallOut', () => {
  it('renders nothing when the query parsed', () => {
    const { container } = render(
      <EntitySearchErrorCallOut
        schema={ENTITY_SEARCH_SCHEMA}
        error={null}
        searchableFields="id, title or author"
        filterSelectors="Status and Integration"
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the parse error and names the fields the free text matches', () => {
    const { getByText } = render(
      <EntitySearchErrorCallOut
        schema={ENTITY_SEARCH_SCHEMA}
        error={UNKNOWN_FIELD}
        searchableFields="id, title or author"
        filterSelectors="Status and Integration"
      />
    );

    getByText('Invalid search: Unknown field `document.id`');
    getByText(/Type the value on its own to search by id, title or author\./);
  });

  it('points at the Status and Integration selectors', () => {
    const { getByText } = render(
      <EntitySearchErrorCallOut
        schema={ENTITY_SEARCH_SCHEMA}
        error={{ message: 'Unknown field `author`', queryText: 'author:wazuh' }}
        searchableFields="id, title or author"
        filterSelectors="Status and Integration"
      />
    );

    getByText(/Use the Status and Integration selectors to filter by those fields\./);
  });

  it('names the Rule level selector on rules, which has a third filter', () => {
    const { getByText } = render(
      <EntitySearchErrorCallOut
        schema={ENTITY_SEARCH_SCHEMA}
        error={{ message: 'Unknown field `x`', queryText: 'x:1' }}
        searchableFields={RULES_SEARCHABLE_FIELDS_LABEL}
        filterSelectors={RULES_FILTER_SELECTORS_LABEL}
      />
    );

    getByText(/Use the Status, Integration and Rule level selectors to filter by those fields\./);
  });

  it.each([
    ['rules', RULES_SEARCHABLE_FIELDS_LABEL],
    ['decoders', DECODERS_SEARCHABLE_FIELDS_LABEL],
    ['KVDBs', KVDBS_SEARCHABLE_FIELDS_LABEL],
  ])('gives %s a way out that names its own searchable fields', (_entity, label) => {
    const { getByText } = render(
      <EntitySearchErrorCallOut
        schema={ENTITY_SEARCH_SCHEMA}
        error={{ message: 'Unknown field `x`', queryText: 'x:1' }}
        searchableFields={label}
        filterSelectors="Status and Integration"
      />
    );

    getByText(new RegExp(`Type the value on its own to search by ${label}\\.`));
  });

  it('leaves a grammar error to speak for itself, since it already carries its own fix', () => {
    const message =
      'To use OR in a text search, put it inside quotes: "or". To perform a logical OR, enclose the words in parenthesis: (foo:bar or bar).';
    const { getByText, queryByTestId } = render(
      <EntitySearchErrorCallOut
        schema={ENTITY_SEARCH_SCHEMA}
        error={{ message, queryText: 'level=(or critical)' }}
        searchableFields="id, title or author"
        filterSelectors="Status and Integration"
      />
    );

    getByText(`Invalid search: ${message}`);
    expect(queryByTestId('entitySearchErrorCallOutGuidance')).toBeNull();
  });

  it('renders the bare message when the text is missing', () => {
    const { queryByTestId } = render(
      <EntitySearchErrorCallOut
        schema={ENTITY_SEARCH_SCHEMA}
        error={{}}
        searchableFields="id, title or author"
        filterSelectors="Status and Integration"
      />
    );

    expect(queryByTestId('entitySearchErrorCallOutGuidance')).toBeNull();
  });
});
