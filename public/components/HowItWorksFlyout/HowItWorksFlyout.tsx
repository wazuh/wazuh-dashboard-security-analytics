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
import { SpaceTypes } from '../../../common/constants';
import { SECURITY_ANALYTICS_DOCUMENTATION_URL } from '../../utils/constants';

export const HOW_IT_WORKS_TITLE = 'How security analytics works';

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
    detail: (
      <>
        The top-level unit of security analytics. It groups the <em>decoders</em>, <em>rules</em>{' '}
        and <em>KVDBs</em> that add support for one log source or use case. Each of those belongs to
        exactly one integration and travels with it when the space is promoted.
      </>
    ),
  },
  {
    term: 'Decoders',
    detail: <>A decoder defines how a raw log event is parsed and mapped to normalized fields.</>,
  },
  {
    term: 'Rules',
    detail: (
      <>
        A rule defines the conditions under which the Wazuh engine generates a security finding,
        evaluated on the fields the <em>decoders</em> already normalized.
      </>
    ),
  },
  {
    term: 'KVDBs',
    detail: (
      <>
        A KVDB is a lookup table that <em>decoder</em> or <em>rule</em> logic can reference to
        enrich events.
      </>
    ),
  },
  {
    term: 'Detectors',
    detail: (
      <>
        A detector connects <em>rules</em> to a data source, an index or an alias, and runs
        continuously to identify security findings.
      </>
    ),
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
          <p>
            Security analytics provides the tools for managing the full lifecycle of log
            normalization and event-based detection.
          </p>
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
          <p>
            Three spaces are the stages of the content lifecycle: <em>draft</em>, <em>test</em> and{' '}
            <em>custom</em>. The fourth, <em>standard</em>, holds the content shipped with Wazuh.
          </p>
          <p>
            User-managed content is promoted sequentially from <em>draft</em> to <em>test</em>, and
            from <em>test</em> to <em>custom</em>, after validation.
          </p>
          {/* Wazuh: name the restriction here, so the lists do not repeat it per row. */}
          <p>
            This is why <em>draft</em> is the only space where content can be edited or deleted.
            Further along the pipeline it is already loaded in the engine, so the lists there offer
            no edit or delete action. To change it, edit it in <em>draft</em> and promote again.
          </p>
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
