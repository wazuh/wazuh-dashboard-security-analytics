/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { RulesSharedState } from "./interfaces";

export type CreateDetectorRulesOptions = Pick<
  RulesSharedState,
  "rulesOptions"
>["rulesOptions"];

export interface SecurityAnalyticsPluginConfigType {
  enabled: boolean;
  uxTelemetryInterval: number;
  disabledSettings: string[];
}
