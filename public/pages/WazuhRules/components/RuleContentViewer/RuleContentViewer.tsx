/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  EuiBadge,
  EuiCodeBlock,
  EuiCompressedFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiModalBody,
  EuiText,
} from '@elastic/eui';
import { EnabledHealth } from '../../../../components/Utility/EnabledHealth';
import React, { useState } from 'react';
import { RuleItemInfoBase } from '../../../../../types';
import { BadgeGroup } from '../../../../components/Utility/BadgeGroup';
import {
  CopyableValue,
  DetailsOverview,
  DetailsSection,
  DetailsToolbar,
  LabeledBadge,
  ReferencesSection,
  formatDetailsDate,
} from '../../../../components/DetailsFlyout/DetailsFlyout';
import { getSeverityBadge } from '../../../../utils/helpers';
import { RuleContentYamlViewer } from './RuleContentYamlViewer';
import { MITRE_SECTIONS, parseMitreYml } from '../../utils/mitre';
import { COMPLIANCE_FRAMEWORKS, COMPLIANCE_KEYS, parseComplianceYml } from '../../utils/compliance';
import { load } from 'js-yaml';

function safeLoadYaml(yamlStr: string): unknown {
  try {
    return load(yamlStr);
  } catch {
    return yamlStr;
  }
}

export interface RuleContentViewerProps {
  rule: RuleItemInfoBase;
}

export const RuleContentViewer: React.FC<RuleContentViewerProps> = ({
  rule: { _source: ruleData, _id: ruleId, integration, space },
}) => {
  if (!ruleData.id) {
    ruleData.id = ruleId;
  }
  const [selectedEditorType, setSelectedEditorType] = useState('visual');
  const metadata = ruleData.metadata;

  const mitreData = parseMitreYml(ruleData.mitre);
  const mitreCount = MITRE_SECTIONS.reduce((n, s) => n + mitreData[s.field].length, 0);

  const complianceData = parseComplianceYml(ruleData.compliance);
  const complianceCount = COMPLIANCE_KEYS.reduce((n, k) => n + complianceData[k].length, 0);

  const tags = ruleData.tags ?? [];
  const falsePositives = ruleData.false_positives ?? [];

  return (
    <EuiModalBody>
      <DetailsToolbar
        status={[
          <EnabledHealth
            key="enabled"
            enabled={ruleData.enabled}
            data-test-subj="rule_flyout_enabled"
          />,
          <div key="level" data-test-subj="rule_flyout_rule_level">
            {getSeverityBadge(ruleData.level)}
          </div>,
          <LabeledBadge
            key="status"
            label="Rule status"
            value={ruleData.status}
            testSubj="rule_flyout_rule_status"
          />,
          <LabeledBadge key="space" label="Space" value={space} testSubj="rule_flyout_space" />,
        ]}
        selectedView={selectedEditorType}
        onChangeView={setSelectedEditorType}
        viewSwitchTestSubj="change-editor-type"
        viewSwitchLegend="This is editor type selector"
      />
      {selectedEditorType === 'visual' && (
        <>
          <DetailsOverview
            description={metadata?.description}
            descriptionTestSubj="rule_flyout_rule_description"
            testSubj="rule_flyout_rule_overview"
            items={[
              { title: 'Integration', description: integration?.document?.metadata?.title },
              { title: 'Author', description: metadata?.author },
              { title: 'Created', description: formatDetailsDate(metadata?.date) },
              { title: 'Modified', description: formatDetailsDate(metadata?.modified) },
              {
                title: 'ID',
                description: ruleData.id && (
                  <CopyableValue
                    value={ruleData.id}
                    ariaLabel="Copy ID"
                    testSubj="rule_flyout_copy_id"
                  />
                ),
              },
              { title: 'Documentation', description: metadata?.documentation },
              {
                title: 'Supports',
                description: metadata?.supports?.length ? (
                  <BadgeGroup values={metadata.supports} />
                ) : null,
              },
            ]}
          />
          <DetailsSection
            id="rule_flyout_section_detection"
            testSubj="rule_flyout_section_detection"
            title="Detection"
            initialIsOpen
          >
            <EuiCodeBlock
              language="yaml"
              isCopyable
              overflowHeight={300}
              data-test-subj="rule_flyout_rule_detection"
            >
              {ruleData.detection}
            </EuiCodeBlock>
          </DetailsSection>
          {mitreCount > 0 && (
            <DetailsSection
              id="rule_flyout_section_mitre"
              testSubj="rule_flyout_section_mitre"
              title="MITRE ATT&CK"
              count={mitreCount}
              initialIsOpen
            >
              <EuiFlexGroup
                direction="column"
                gutterSize="s"
                data-test-subj="rule_flyout_rule_mitre"
              >
                {MITRE_SECTIONS.map((section) => {
                  const entries = mitreData[section.field];
                  if (!entries.length) return null;
                  return (
                    <EuiFlexItem key={section.field}>
                      <BadgeGroup
                        label={section.title}
                        values={entries.map((e) => (e.name ? `${e.id} - ${e.name}` : e.id))}
                      />
                    </EuiFlexItem>
                  );
                })}
              </EuiFlexGroup>
            </DetailsSection>
          )}
          {complianceCount > 0 && (
            <DetailsSection
              id="rule_flyout_section_compliance"
              testSubj="rule_flyout_section_compliance"
              title="Compliance"
              count={complianceCount}
            >
              <EuiFlexGroup
                direction="column"
                gutterSize="s"
                data-test-subj="rule_flyout_rule_compliance"
              >
                {COMPLIANCE_FRAMEWORKS.map((framework) =>
                  complianceData[framework.key].length > 0 ? (
                    <EuiFlexItem key={framework.key}>
                      {/* name what the codes are. A reader saw bare numbers like
                          6.5.10 under the framework name. Each framework calls its unit
                          something different, and `compliance.ts` already stored that word
                          in `columnHeader`, which nothing read. */}
                      <BadgeGroup
                        label={`${framework.label} ${framework.columnHeader.toLowerCase()}`}
                        values={complianceData[framework.key]}
                      />
                    </EuiFlexItem>
                  ) : null
                )}
              </EuiFlexGroup>
            </DetailsSection>
          )}
          {tags.length > 0 && (
            <DetailsSection
              id="rule_flyout_section_tags"
              testSubj="rule_flyout_section_tags"
              title="Tags"
              count={tags.length}
            >
              <EuiFlexGroup
                direction="row"
                wrap
                gutterSize="s"
                responsive={false}
                data-test-subj="rule_flyout_rule_tags"
              >
                {tags.map((tag: { value: string }, i: number) => (
                  <EuiFlexItem grow={false} key={i}>
                    <EuiBadge>
                      {tag.value.match(/attack\.t[0-9]+/) ? (
                        <EuiLink
                          href={`https://attack.mitre.org/techniques/${tag.value
                            .split('.')
                            .slice(1)
                            .join('/')
                            .toUpperCase()}`}
                          target="_blank"
                        >
                          {tag.value}
                        </EuiLink>
                      ) : (
                        tag.value
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </DetailsSection>
          )}
          {falsePositives.length > 0 && (
            <DetailsSection
              id="rule_flyout_section_false_positives"
              testSubj="rule_flyout_section_false_positives"
              title="False positive cases"
              count={falsePositives.length}
            >
              <EuiText size="s" data-test-subj="rule_flyout_rule_false_positives">
                <ul>
                  {falsePositives.map((falsePositive: { value: string }, i: number) => (
                    <li key={i}>{falsePositive.value}</li>
                  ))}
                </ul>
              </EuiText>
            </DetailsSection>
          )}
          <ReferencesSection
            idPrefix="rule_flyout"
            urls={metadata?.references}
            linksTestSubj="rule_flyout_rule_references"
          />
        </>
      )}
      {selectedEditorType === 'yaml' && (
        <EuiCompressedFormRow label="Rule" fullWidth>
          <RuleContentYamlViewer rule={ruleData} />
        </EuiCompressedFormRow>
      )}
      {selectedEditorType === 'json' && (
        <EuiCodeBlock language="json" isCopyable>
          {JSON.stringify(
            {
              ...ruleData,
              detection: ruleData.detection ? safeLoadYaml(ruleData.detection) : undefined,
              mitre: ruleData.mitre ? safeLoadYaml(ruleData.mitre) : undefined,
              compliance: ruleData.compliance ? safeLoadYaml(ruleData.compliance) : undefined,
            },
            null,
            2
          )}
        </EuiCodeBlock>
      )}
    </EuiModalBody>
  );
};
