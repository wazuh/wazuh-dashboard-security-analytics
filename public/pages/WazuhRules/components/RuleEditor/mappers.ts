/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Rule } from '../../../../../types';
import { getLogTypeFromLogSource } from '../../utils/helpers';
import { RuleEditorFormModel, ruleEditorStateDefaultValue } from './RuleEditorFormModel';

export const mapFormToRule = (formState: RuleEditorFormModel): Rule => {
  // The indexer requires logsource.product to match the integration title, so the
  // selected integration wins over a product carried in from the YAML editor.
  const logSource = { ...(formState.log_source ?? {}) };
  if (formState.integration) {
    logSource.product = formState.integration;
  }

  const title = formState.metadata.title;
  const description = formState.metadata.description;
  const author = formState.metadata.author;
  const references = formState.metadata.references;
  const documentation = formState.metadata.documentation;
  const supports = formState.metadata.supports;

  const rule: any = {
    id: formState.id,
    sigma_id: formState.sigma_id,
    category: formState.integration,
    status: formState.status,
    tags: formState.tags.map((tag) => ({ value: tag })),
    log_source: logSource,
    detection: formState.detection,
    level: formState.level,
    false_positives: formState.falsePositives.map((falsePositive) => ({
      value: falsePositive,
    })),
    metadata: {
      title,
      author,
      description,
      references,
      documentation,
      supports,
    },
    mitre: formState.mitre,
    compliance: formState.compliance,
    enabled: formState.enabled,
  };

  return rule as Rule;
};

export const mapRuleToForm = (rule: Rule): RuleEditorFormModel => {
  // `category` may hold logsource.category for display, so the integration title
  // comes from logsource.product first.
  const logType =
    rule.log_source?.product || rule.category || getLogTypeFromLogSource(rule.log_source);

  const metadataTitle = rule.metadata?.title;
  const metadataDescription = rule.metadata?.description;
  const metadataAuthor = rule.metadata?.author;
  const metadataReferences = rule.metadata?.references;
  const metadataDocumentation = rule.metadata?.documentation;
  const metadataSupports = rule.metadata?.supports;

  return {
    id: rule.id,
    sigma_id: rule.sigma_id,
    log_source: rule.log_source,
    integration: logType || '',
    status: rule.status,
    tags: rule.tags ? rule.tags.map((tag) => tag.value) : ruleEditorStateDefaultValue.tags,
    detection: rule.detection,
    level: rule.level,
    falsePositives: rule.false_positives?.length
      ? rule.false_positives.map((fp) => fp.value)
      : ruleEditorStateDefaultValue.falsePositives,
    mitre: rule.mitre || '',
    compliance: rule.compliance,
    enabled: rule.enabled ?? true,
    metadata: {
      title: metadataTitle ?? ruleEditorStateDefaultValue.metadata.title,
      description: metadataDescription ?? ruleEditorStateDefaultValue.metadata.description,
      author: metadataAuthor ?? ruleEditorStateDefaultValue.metadata.author,
      references: metadataReferences ?? ruleEditorStateDefaultValue.metadata.references,
      supports: metadataSupports ?? ruleEditorStateDefaultValue.metadata.supports,
      documentation: metadataDocumentation ?? ruleEditorStateDefaultValue.metadata.documentation,
    },
  };
};
