/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Wazuh: EuiLink and EuiIcon dropped with the Detector dashboard field below.
import { EuiSmallButton, EuiSpacer, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { ContentPanel } from '../../../../components/ContentPanel';
import { createTextDetailsGroup, parseSchedule } from '../../../../utils/helpers';
// Wazuh: replaced the `moment` import with formatUIDate to honor the
// `dateFormat`/`dateFormat:tz` advanced settings (upstream imported `moment` here).
import { formatUIDate } from '../../../../utils/dateFormat';
// Wazuh: logTypesWithDashboards dropped with the Detector dashboard field below.
import { DEFAULT_EMPTY_DATA } from '../../../../utils/constants';
import { isStandardSource } from '../../../../utils/detectorSource';
import { Detector } from '../../../../../types';
// Wazuh: remove integration title formatting
// import { getLogTypeLabel } from '../../../LogTypes/utils/helpers';

export interface DetectorBasicDetailsViewProps {
  detector: Detector;
  dashboardId?: string;
  rulesCanFold?: boolean;
  enabled_time?: number;
  last_update_time?: number;
  onEditClicked: () => void;
  isEditable: boolean;
  space?: string; // Wazuh
}

export const DetectorBasicDetailsView: React.FC<DetectorBasicDetailsViewProps> = ({
  detector,
  enabled_time,
  last_update_time,
  rulesCanFold,
  children,
  // dashboardId, // Wazuh: unused since the Detector dashboard field is hidden
  onEditClicked,
  isEditable = true,
  space, // Wazuh
}) => {
  const { name, detector_type, inputs, schedule } = detector;
  const detectorSchedule = parseSchedule(schedule);
  const isStandardDetector = isStandardSource(detector.source);
  // Wazuh: format Created / Modified with formatUIDate so they honor the
  // `dateFormat`/`dateFormat:tz` settings. Upstream used the hardcoded
  // `moment(...).format('YYYY-MM-DDTHH:mm')`.
  const createdAt = enabled_time ? formatUIDate(enabled_time) : undefined;
  const lastUpdated = last_update_time ? formatUIDate(last_update_time) : undefined;
  const totalSelected = detector.inputs.reduce((sum, inputObj) => {
    return (
      sum +
      inputObj.detector_input.custom_rules.length +
      inputObj.detector_input.pre_packaged_rules.length
    );
  }, 0);
  return (
    <ContentPanel
      title={'Detector details'}
      actions={
        isEditable
          ? [
              <EuiToolTip
                content={isStandardDetector ? 'Only custom detectors can be edited.' : undefined}
              >
                <EuiSmallButton
                  onClick={onEditClicked}
                  isDisabled={isStandardDetector}
                  data-test-subj={'edit-detector-basic-details'}
                >
                  Edit
                </EuiSmallButton>
              </EuiToolTip>,
            ]
          : null
      }
    >
      <EuiSpacer size={'l'} />
      {createTextDetailsGroup([
        { label: 'Detector name', content: name },
        {
          label: 'Integration', // Wazuh: reorganize props
          content: detector_type, // Wazuh: remove integration title formatting
        }, // Changed Log Type to Integration by Wazuh
        {
          // Wazuh: add space
          label: 'Space',
          content: space,
        },
      ])}
      {createTextDetailsGroup([
        {
          label: 'Data source',
          content: (
            <>
              {inputs[0].detector_input.indices.map((ind: string) => (
                <EuiText key={ind}>{ind}</EuiText>
              ))}
            </>
          ),
        },
        { label: 'Detector schedule', content: detectorSchedule }, // Wazuh: reorganize props
        // Wazuh: hide the Detector dashboard field. `logTypesWithDashboards`
        // (public/utils/constants.ts) only holds network, cloudtrail and s3, so a Wazuh
        // integration name can never match it and the field is a permanent dead end.
        // {
        //   label: 'Detector dashboard',
        //   content: dashboardId ? (
        //     <EuiLink onClick={() => window.open(`dashboards#/view/${dashboardId}`, '_blank')}>
        //       {`${name} summary`}
        //       <EuiIcon type={'popout'} />
        //     </EuiLink>
        //   ) : !logTypesWithDashboards.has(detector_type) ? (
        //     'Not available for this integration' // Changed Log Type to Integration by Wazuh
        //   ) : (
        //     '-'
        //   ),
        // },
        {
          // Wazuh: reorganize props, Description takes the slot the hidden
          // Detector dashboard field left, so the group keeps three items.
          label: 'Description',
          content: inputs[0].detector_input.description || DEFAULT_EMPTY_DATA,
        },
      ])}
      {createTextDetailsGroup([
        { label: 'Rules', content: totalSelected }, // Wazuh: rename 'Detection rules' to 'Rules'
        { label: 'Created', content: createdAt || DEFAULT_EMPTY_DATA },
        {
          label: 'Modified',
          content: lastUpdated || DEFAULT_EMPTY_DATA,
        },
      ])}
      {rulesCanFold ? children : null}
    </ContentPanel>
  );
};
