/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

/**
 * A form label with the optional marker rendered the way the filter form renders
 * it — `Name - `+`<em>optional</em>`.
 *
 * `FormFieldHeader`'s own `optionalField` emits `<i> - optional </i>`, whose
 * trailing space leaves a visible gap before the tooltip icon and reads slightly
 * differently from the filter form. The bold title is kept, so these labels still
 * sit consistently with the standard fields above them.
 */
export const fieldLabel = (title: string, optional = false): React.ReactNode => (
  <EuiText size={'s'}>
    <strong>{title}</strong>
    {optional && (
      <>
        {' - '}
        <em>optional</em>
      </>
    )}
  </EuiText>
);

/**
 * The label each document path is shown under, for the fields that have one.
 *
 * Validation messages come from the JSON Schema and name the document path —
 * `'metadata.title' is required`. The sibling forms write their own messages and
 * say `Title is required`, so the same error reads two different ways depending on
 * which entity you are editing. This map lets `humanizeErrors` close that gap.
 *
 * A path that is **absent** here keeps its path in the message, deliberately:
 * inside `normalize` there is no field to name, and `normalize[2].map` is how the
 * user finds the problem in the YAML.
 *
 * Keys are document paths, which is what the messages contain. `labels.test.tsx`
 * checks every label here is one the form actually renders, so the two cannot
 * drift apart.
 */
export const FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  name: 'Name',
  enabled: 'Enabled',
  parents: 'Parents',
  definitions: 'Definitions',
  check: 'Check',
  'metadata.title': 'Title',
  'metadata.author': 'Author',
  'metadata.description': 'Description',
  'metadata.documentation': 'Documentation',
  'metadata.references': 'References',
  'metadata.supports': 'Supports',
  'metadata.compatibility': 'Compatibility',
};
