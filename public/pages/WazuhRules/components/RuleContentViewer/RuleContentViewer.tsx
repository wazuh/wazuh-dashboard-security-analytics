/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiCompressedFormRow,
  EuiCopy,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiModalBody,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { EnabledHealth } from '../../../../components/Utility/EnabledHealth';
import React, { useState } from 'react';
import { RuleItemInfoBase } from '../../../../../types';
import { BadgeGroup } from '../../../../components/Utility/BadgeGroup';
import { getSeverityBadge } from '../../../../utils/helpers';
import { formatUIDate } from '../../../../utils/dateFormat';
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

// Rule dates are usually date-only (`2026-07-28`); formatting them with the
// `dateFormat` setting would print a meaningless `@ 00:00:00.000`. Parsed as local
// midnight so the day does not shift with the timezone.
export const formatRuleDate = (value?: string) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : value && formatUIDate(value);

export interface RuleContentViewerProps {
  rule: RuleItemInfoBase;
}

const editorTypes = [
  { id: 'visual', label: 'Visual' },
  { id: 'yaml', label: 'YAML' },
  { id: 'json', label: 'JSON' },
];

const Section: React.FC<{ id: string; title: string; count?: number; initialIsOpen?: boolean }> = ({
  id,
  title,
  count,
  initialIsOpen = false,
  children,
}) => (
  <>
    <EuiAccordion
      id={`rule_flyout_section_${id}`}
      data-test-subj={`rule_flyout_section_${id}`}
      initialIsOpen={initialIsOpen}
      paddingSize="s"
      buttonContent={
        <EuiTitle size="xxs">
          <h3>{count === undefined ? title : `${title} (${count})`}</h3>
        </EuiTitle>
      }
    >
      {children}
    </EuiAccordion>
    <EuiSpacer size="m" />
  </>
);

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
  const references: string[] = (metadata?.references ?? []).filter(Boolean);

  // Empty fields are left out instead of rendering a `-` row.
  const overviewItems = [
    { title: 'Integration', description: integration?.document?.metadata?.title },
    { title: 'Author', description: metadata?.author },
    { title: 'Created', description: formatRuleDate(metadata?.date) },
    { title: 'Modified', description: formatRuleDate(metadata?.modified) },
    {
      title: 'ID',
      description: ruleData.id && (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false} style={{ minWidth: 0, wordBreak: 'break-all' }}>
            {ruleData.id}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={ruleData.id}>
              {(copy) => (
                <EuiButtonIcon
                  iconType="copyClipboard"
                  aria-label="Copy ID"
                  size="xs"
                  onClick={copy}
                  data-test-subj="rule_flyout_copy_id"
                />
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    { title: 'Documentation', description: metadata?.documentation },
    {
      title: 'Supports',
      description: metadata?.supports?.length ? <BadgeGroup values={metadata.supports} /> : null,
    },
  ].filter(({ description }) => description);

  return (
    <EuiModalBody>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EnabledHealth enabled={ruleData.enabled} data-test-subj="rule_flyout_enabled" />
            </EuiFlexItem>
            <EuiFlexItem grow={false} data-test-subj="rule_flyout_rule_level">
              {getSeverityBadge(ruleData.level)}
            </EuiFlexItem>
            {ruleData.status && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="rule_flyout_rule_status">
                  Rule status: {ruleData.status}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {space && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="rule_flyout_space">
                  Space: {space}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            data-test-subj="change-editor-type"
            legend="This is editor type selector"
            options={editorTypes}
            idSelected={selectedEditorType}
            onChange={(id) => setSelectedEditorType(id)}
            buttonSize="compressed"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      {selectedEditorType === 'visual' && (
        <>
          {metadata?.description && (
            <>
              <EuiText size="s" data-test-subj="rule_flyout_rule_description">
                <p>{metadata.description}</p>
              </EuiText>
              <EuiSpacer size="m" />
            </>
          )}
          {overviewItems.length > 0 && (
            <>
              <EuiDescriptionList
                type="column"
                compressed
                listItems={overviewItems}
                titleProps={{ style: { width: '30%' } }}
                descriptionProps={{ style: { width: '70%' } }}
                data-test-subj="rule_flyout_rule_overview"
              />
              <EuiSpacer size="l" />
            </>
          )}
          <Section id="detection" title="Detection" initialIsOpen>
            <EuiCodeBlock
              language="yaml"
              isCopyable
              overflowHeight={300}
              data-test-subj="rule_flyout_rule_detection"
            >
              {ruleData.detection}
            </EuiCodeBlock>
          </Section>
          {mitreCount > 0 && (
            <Section id="mitre" title="MITRE ATT&CK" count={mitreCount} initialIsOpen>
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
            </Section>
          )}
          {complianceCount > 0 && (
            <Section id="compliance" title="Compliance" count={complianceCount}>
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
            </Section>
          )}
          {tags.length > 0 && (
            <Section id="tags" title="Tags" count={tags.length}>
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
            </Section>
          )}
          {falsePositives.length > 0 && (
            <Section
              id="false_positives"
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
            </Section>
          )}
          {references.length > 0 && (
            <Section id="references" title="References" count={references.length}>
              <EuiText size="s" data-test-subj="rule_flyout_rule_references">
                {references.map((url, i) => (
                  // Truncate long URLs; the tooltip shows the full one and the
                  // external icon stays on the same line.
                  <EuiToolTip key={i} content={url} display="block">
                    <EuiLink
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', maxWidth: '100%' }}
                    >
                      <span className="eui-textTruncate">{url}</span>
                    </EuiLink>
                  </EuiToolTip>
                ))}
              </EuiText>
            </Section>
          )}
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
