/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { PROMOTE_ENTITIES_LABELS } from '../../../utils/constants';
import { PromoteInconsistency } from '../../../hooks/usePromoteInconsistencies';

const formatMissingNames = (names: string[]) => {
  const preview = names.slice(0, 5).join(', ');
  const extra = names.length > 5 ? `, +${names.length - 5} more` : '';
  return `${preview}${extra}.`;
};

const InconsistencyItem: React.FC<{ item: PromoteInconsistency }> = ({ item }) => {
  const { parent, parentTitle, dep, missingNames } = item;
  const depLabel = PROMOTE_ENTITIES_LABELS[dep] || dep;
  const names = formatMissingNames(missingNames);

  if (parent === 'integrations' && parentTitle) {
    return (
      <>
        Integration <b>{parentTitle}</b> bundles <b>{missingNames.length}</b> <b>{depLabel}</b> not
        selected: {names}
      </>
    );
  }
  if (parent === 'decoders/rules/kvdbs') {
    return <>Selected items whose parent integration is not selected: {names}</>;
  }
  return (
    <>
      <b>{PROMOTE_ENTITIES_LABELS[parent] || parent}</b> selected, but <b>{missingNames.length}</b>{' '}
      <b>{depLabel}</b> not selected: {names}
    </>
  );
};

export const InconsistenciesCallout: React.FC<{
  inconsistencies: PromoteInconsistency[];
}> = ({ inconsistencies }) => {
  if (inconsistencies.length === 0) {
    return null;
  }
  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        size="s"
        color="warning"
        iconType="alert"
        title="Your selection has potential broken references"
      >
        <ul>
          {inconsistencies.map((item, i) => (
            <li key={`${item.parent}-${item.dep}-${item.parentTitle ?? ''}-${i}`}>
              <InconsistencyItem item={item} />
            </li>
          ))}
        </ul>
        <EuiText size="xs">
          Promotion may fail or leave the target space with inconsistencies.
        </EuiText>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
