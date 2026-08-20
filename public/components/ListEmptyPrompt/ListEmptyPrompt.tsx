/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLink, EuiText, EuiTitle } from '@elastic/eui';
import { SPACE_ACTIONS, SpaceTypes } from '../../../common/constants';
import { actionIsAllowedOnSpace, getPreviousSpace } from '../../../common/helpers';
import { PromoteSpaces } from '../../../types';

export interface ListEmptyPromptProps {
  /** Plural entity name as it appears in copy, for example `decoders`. */
  entity: string;
  /** True when a search or any filter is applied, which selects the no-results mode. */
  hasFilters: boolean;
  /** The active space, so the Standard hint is hidden while already in Standard. */
  space?: string;
  /** Switches to the Standard space. Omit for entities Wazuh does not ship. */
  onGoToStandard?: () => void;
  /** Replaces the default "No {entity} in this space" title. */
  noContentTitle?: string;
  /** True when the list only offers free-text search, so the copy drops "filters". */
  searchOnly?: boolean;
  /** What to do when the space is empty, for example a create button. */
  actions?: React.ReactNode;
  /** Replaces the default "Create one, or ..." body. Pass null to render no body. */
  emptyBody?: React.ReactNode;
}

// Wazuh: the entity is already explained in the page description, so this says what to
// do next instead of repeating it.
export const ListEmptyPrompt: React.FC<ListEmptyPromptProps> = ({
  entity,
  hasFilters,
  space,
  onGoToStandard,
  noContentTitle,
  searchOnly,
  actions,
  emptyBody,
}) => {
  if (hasFilters) {
    return (
      <EuiEmptyPrompt
        style={{ maxWidth: '45em' }}
        title={
          <EuiTitle size="xs">
            <h3>
              No {entity} match your search{searchOnly ? '' : ' or filters'}
            </h3>
          </EuiTitle>
        }
        body={
          <EuiText size="s">
            <p>
              {searchOnly
                ? `Clear it to see all ${entity}.`
                : space
                ? 'Clear them to see everything in this space.'
                : `Clear them to see all ${entity}.`}
            </p>
          </EuiText>
        }
      />
    );
  }

  const showStandardHint = !!onGoToStandard && space !== SpaceTypes.STANDARD.value;
  // Wazuh: content is only created in Draft. Test and Custom receive it by promotion, so
  // pointing them at a create action would be a dead end.
  const canCreate = !space || actionIsAllowedOnSpace(space, SPACE_ACTIONS.CREATE);
  const previousSpace = space ? getPreviousSpace(space as PromoteSpaces) : null;
  const howToFill = canCreate
    ? 'Create one from the Actions menu'
    : previousSpace &&
      `Promote ${entity} from the ${SpaceTypes[previousSpace.toUpperCase()].label} space`;

  return (
    <EuiEmptyPrompt
      style={{ maxWidth: '45em' }}
      title={
        <EuiTitle size="xs">
          <h3>{noContentTitle ?? `No ${entity} in this space`}</h3>
        </EuiTitle>
      }
      body={
        <EuiText size="s">
          {emptyBody !== undefined ? (
            emptyBody
          ) : (
            <p>
              {howToFill}
              {showStandardHint && (
                <>
                  {howToFill ? ', or switch' : 'Switch'} to the{' '}
                  <EuiLink onClick={onGoToStandard}>
                    {SpaceTypes.STANDARD.label.toLowerCase()} space
                  </EuiLink>{' '}
                  to see the {entity} shipped with Wazuh
                </>
              )}
              .
            </p>
          )}
        </EuiText>
      }
      actions={actions}
    />
  );
};
