/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { DEFAULT_RULE_UUID } from '../../../../../common/constants';
import { Rule } from '../../../../../types';
import { ruleStatus } from '../../../Rules/utils/constants';

export interface RuleEditorFormModel {
  id: string;
  log_source: { product?: string; category?: string; service?: string };
  integration: string;
  name: string;
  description: string;
  status: string;
  author: string;
  references: string[];
  tags: string[];
  detection: string;
  level: string;
  falsePositives: string[];
  mitre: string;
  compliance: string;
  enabled: boolean;
  metadata?: Rule['metadata'];
}

export const ruleEditorStateDefaultValue: RuleEditorFormModel = {
  id: DEFAULT_RULE_UUID,
  log_source: {},
  integration: '',
  name: '',
  description: '',
  status: ruleStatus[0],
  author: '',
  references: [],
  tags: [],
  detection: '',
  level: '',
  falsePositives: [],
  mitre: '',
  compliance: '',
  enabled: true,
};
