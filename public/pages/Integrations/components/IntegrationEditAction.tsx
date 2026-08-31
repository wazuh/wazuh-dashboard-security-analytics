/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { SPACE_ACTIONS } from '../../../../common/constants';
import { getSpacesAllowAction } from '../../../../common/helpers';

export interface IntegrationEditActionProps {
  /** Label of the entity the row holds, as it reads in a sentence: 'decoder', 'rule', 'KVDB'. */
  entityLabel: string;
  canEdit: boolean;
  onClick: () => void;
  'data-test-subj'?: string;
}

export const IntegrationEditAction: React.FC<IntegrationEditActionProps> = ({
  entityLabel,
  canEdit,
  onClick,
  'data-test-subj': dataTestSubj,
}) => {
  const label = `Edit ${entityLabel}`;
  // Only the first letter, so an acronym keeps its case ('KVDB', not 'Kvdb').
  const entitySentenceStart = `${entityLabel.charAt(0).toUpperCase()}${entityLabel.slice(1)}`;
  const tooltip = canEdit
    ? label
    : `${entitySentenceStart} can only be edited in the spaces: ${getSpacesAllowAction(
        SPACE_ACTIONS.EDIT
      ).join(', ')}`;

  return (
    <EuiToolTip content={tooltip}>
      <span>
        <EuiButtonIcon
          iconType="pencil"
          color="primary"
          isDisabled={!canEdit}
          onClick={onClick}
          aria-label={label}
          data-test-subj={dataTestSubj}
        />
      </span>
    </EuiToolTip>
  );
};
