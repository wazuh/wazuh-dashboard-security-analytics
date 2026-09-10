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
