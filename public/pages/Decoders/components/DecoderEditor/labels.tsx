/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

/** Field label, with the optional marker the filter form uses. */
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
 * Document path to the label the form shows, so a schema message can name the
 * field the way the user sees it. A path absent here keeps its path — inside
 * `normalize` there is no field to name.
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
