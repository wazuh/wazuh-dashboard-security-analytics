/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  SPACES_LIFECYCLE_SUMMARY,
  SPACES_PROMOTION_SUMMARY,
  SpaceTypes,
} from '../../../common/constants';
import { SECURITY_ANALYTICS_DOCUMENTATION_URL } from '../../utils/constants';

export const HOW_IT_WORKS_TITLE = 'How Security Analytics works';

// Wazuh: the help menu registers a plain callback outside React, so the open state lives
// here and the flyout subscribes to it.
type Listener = (open: boolean) => void;
const listeners = new Set<Listener>();
let isOpen = false;

const setOpen = (open: boolean) => {
  isOpen = open;
  listeners.forEach((listener) => listener(open));
};

export const openHowItWorksFlyout = () => setOpen(true);

const ENTITIES = [
  {
    term: 'Integrations',
    detail:
      'An integration groups the decoders, rules and KVDBs that add support for one log source. Each of those belongs to exactly one integration and travels with it when the space is promoted.',
  },
  {
    term: 'Decoders',
    detail: 'A decoder defines how a raw log event is parsed into normalized fields.',
  },
  {
    term: 'Rules',
    detail:
      'A rule defines the conditions under which the engine generates a finding, evaluated on the fields the decoders already normalized.',
  },
  {
    term: 'KVDBs',
    detail:
      'A KVDB is a lookup table that content in its integration can query to enrich or check events.',
  },
  {
    term: 'Detectors',
    detail: 'A detector connects rules to a data source and runs continuously to produce findings.',
  },
];

const STAGES = [SpaceTypes.DRAFT, SpaceTypes.TEST, SpaceTypes.CUSTOM];

export const HowItWorksFlyout: React.FC = () => {
  const [open, setOpenState] = useState<boolean>(isOpen);

  useEffect(() => {
    listeners.add(setOpenState);
    return () => {
      listeners.delete(setOpenState);
    };
  }, []);

  if (!open) {
    return null;
  }

  const close = () => setOpen(false);

  return (
    <EuiFlyout onClose={close} size="s" ownFocus aria-labelledby="howItWorksFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="howItWorksFlyoutTitle">{HOW_IT_WORKS_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>Security Analytics manages the full lifecycle of log normalization and detection.</p>
        </EuiText>

        <EuiSpacer size="l" />

        <EuiTitle size="xs">
          <h3>What the pieces are</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          {ENTITIES.map((entity) => (
            <p key={entity.term}>
              <strong>{entity.term}.</strong> {entity.detail}
            </p>
          ))}
        </EuiText>

        <EuiHorizontalRule margin="l" />

        <EuiTitle size="xs">
          <h3>How content reaches production</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>{SPACES_LIFECYCLE_SUMMARY}</p>
          <p>{SPACES_PROMOTION_SUMMARY}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s">
          {STAGES.map((stage, index) => (
            <p key={stage.value}>
              <strong>
                {index + 1}. {stage.label}.
              </strong>{' '}
              {stage.description}
            </p>
          ))}
          <p>
            <strong>{SpaceTypes.STANDARD.label}.</strong> {SpaceTypes.STANDARD.description} It is
            reference for building your own content, not a stage in the pipeline.
          </p>
        </EuiText>

        <EuiHorizontalRule margin="l" />

        <EuiText size="s">
          <EuiLink href={SECURITY_ANALYTICS_DOCUMENTATION_URL} target="_blank" external>
            Read the full documentation
          </EuiLink>
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
