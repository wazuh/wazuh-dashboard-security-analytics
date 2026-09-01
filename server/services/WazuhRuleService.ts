/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  OpenSearchDashboardsRequest,
  OpenSearchDashboardsResponseFactory,
  IOpenSearchDashboardsResponse,
  ResponseError,
  RequestHandlerContext,
  ILegacyCustomClusterClient,
} from 'opensearch-dashboards/server';
import {
  DeleteRuleParams,
  DeleteRuleResponse,
  GetRulesParams,
  GetRulesResponse,
} from '../models/interfaces';
import { CLIENT_RULE_METHODS, CONTENT_INDICES } from '../utils/constants';
import {
  applyEntityFilters,
  EntityStatus,
  escapeWildcard,
  extractErrorMessage,
  mergeIdsClause,
  resolveIdsByIntegrationMatch,
} from '../utils/helpers';
import { ServerResponse } from '../models/types';
import { load } from 'js-yaml';
import { Rule } from '../../types';
import { SpaceTypes } from '../../common/constants';

export default class WazuhRulesService {
  constructor(private osDriver: ILegacyCustomClusterClient) {}

  private getClient(request: OpenSearchDashboardsRequest) {
    return this.osDriver.asScoped(request).callAsCurrentUser;
  }

  private getSpaceFromPrePackaged(prePackaged: boolean): string {
    return prePackaged === false ? SpaceTypes.CUSTOM.value : SpaceTypes.STANDARD.value;
  }

  private buildQuery(
    prePackaged: boolean,
    incomingQuery?: any,
    space?: string,
    opts?: { status?: EntityStatus; integrationIds?: string[]; levels?: string[] }
  ) {
    // When an explicit space is provided it takes precedence over the prePackaged binary model
    const spaceTerm = {
      term: { 'space.name': space ?? this.getSpaceFromPrePackaged(prePackaged) },
    };
    const hasExtraFilters =
      Boolean(opts?.status) ||
      Boolean(opts?.integrationIds?.length) ||
      Boolean(opts?.levels?.length);

    // Skip the bool.must/filter wrapping entirely when no filter is selected.
    if (!hasExtraFilters) {
      const bool: any = { filter: [spaceTerm] };
      if (incomingQuery && !incomingQuery.match_all) {
        bool.must = [incomingQuery];
      }
      return { bool };
    }

    const baseQuery = incomingQuery && !incomingQuery.match_all ? incomingQuery : { match_all: {} };
    const composed = applyEntityFilters(baseQuery, {
      status: opts?.status,
      integrationIds: opts?.integrationIds,
      levels: opts?.levels,
    });
    composed.bool.filter.unshift(spaceTerm);
    return composed;
  }

  private parseYamlField(yamlStr: string | undefined): any {
    if (!yamlStr || (typeof yamlStr === 'string' && !yamlStr.trim())) return undefined;
    if (typeof yamlStr !== 'string') return yamlStr;
    try {
      return load(yamlStr);
    } catch {
      return undefined;
    }
  }

  private buildRuleResource(rule: Rule) {
    const resource: Record<string, any> = {
      level: rule.level,
      status: rule.status,
      logsource:
        rule.log_source && Object.keys(rule.log_source).length > 0
          ? rule.log_source
          : { product: rule.category },
      detection: load(rule.detection),
      enabled: rule.enabled ?? true,
    };
    if (rule.tags?.length) resource.tags = rule.tags.map((t) => t.value);
    if (rule.false_positives?.length)
      resource.falsepositives = rule.false_positives.map((fp) => fp.value);

    const metadata: Record<string, any> = {
      title: rule.metadata?.title,
      author: rule.metadata?.author,
      description: rule.metadata?.description,
      references: rule.metadata?.references?.length ? rule.metadata.references : [],
    };
    if (rule.metadata?.date) metadata.date = rule.metadata.date;
    if (rule.metadata?.modified) metadata.modified = rule.metadata.modified;
    if (rule.metadata?.documentation) metadata.documentation = rule.metadata.documentation;
    if (rule.metadata?.supports?.length) metadata.supports = rule.metadata.supports;
    resource.metadata = metadata;

    const mitre = this.parseYamlField(rule.mitre);
    if (mitre) resource.mitre = mitre;

    const compliance = this.parseYamlField(rule.compliance);
    if (compliance) resource.compliance = compliance;

    return resource;
  }

  private async fetchIntegrationMap(client: any, ruleIds: string[], space: string) {
    const integrationMap = new Map();
    if (!ruleIds.length) return integrationMap;

    try {
      const integrationResponse = await client('search', {
        index: CONTENT_INDICES.INTEGRATIONS,
        body: {
          size: 10000,
          query: {
            bool: {
              must: [
                {
                  terms: {
                    'document.rules': ruleIds,
                  },
                },
                {
                  term: {
                    'space.name': space,
                  },
                },
              ],
            },
          },
          _source: ['document.id', 'document.metadata.title', 'document.rules'],
        },
      });
      const integrationHits = integrationResponse?.hits?.hits || [];
      integrationHits.forEach((integrationHit: any) => {
        const rules = integrationHit?._source?.document?.rules || [];
        rules.forEach((ruleId: string) => {
          if (!integrationMap.has(ruleId)) {
            integrationMap.set(ruleId, {
              document: {
                metadata: integrationHit._source.document.metadata,
                id: integrationHit._source.document.id,
              },
            });
          }
        });
      });
    } catch (error: any) {
      console.warn(
        'Ruleset management - WazuhRulesService - fetchIntegrationMap:',
        extractErrorMessage(error)
      );
    }

    return integrationMap;
  }

  // Wazuh: find rule ids belonging to integrations whose name matches the search text,
  // so the rules search can also be reached by integration name.
  private async fetchRuleIdsByIntegrationName(
    client: any,
    searchText: string | undefined,
    space: string
  ): Promise<string[]> {
    const trimmed = searchText?.trim();
    if (!trimmed) return [];

    return resolveIdsByIntegrationMatch(
      client,
      [
        {
          wildcard: {
            'document.metadata.title': {
              value: `*${escapeWildcard(trimmed)}*`,
              case_insensitive: true,
            },
          },
        },
        { term: { 'space.name': space } },
      ],
      'rules',
      'WazuhRulesService - fetchRuleIdsByIntegrationName'
    );
  }

  // Wazuh: unlike fetchRuleIdsByIntegrationName's wildcard search-by-text, this is an
  // exact match — document.metadata.title is keyword-mapped, so `terms` gives
  // precise, case-sensitive matching.
  private async fetchRuleIdsByExactIntegrationName(
    client: any,
    integrationNames: string[] | undefined,
    space: string
  ): Promise<string[]> {
    const trimmed = (integrationNames ?? []).map((name) => name.trim()).filter(Boolean);
    if (!trimmed.length) return [];

    return resolveIdsByIntegrationMatch(
      client,
      [{ terms: { 'document.metadata.title': trimmed } }, { term: { 'space.name': space } }],
      'rules',
      'WazuhRulesService - fetchRuleIdsByExactIntegrationName'
    );
  }

  getRules = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<{}, GetRulesParams>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<GetRulesResponse> | ResponseError>> => {
    try {
      const { prePackaged, space } = request.query as {
        prePackaged: boolean;
        space?: string;
      };

      const {
        from = 0,
        size = 5000,
        query,
        sort,
        _source,
        searchText,
        status,
        integrationNames,
        levels,
      } = (request.body as any) ?? {};
      const client = this.getClient(request);
      const resolvedSpace = space ?? this.getSpaceFromPrePackaged(prePackaged);
      const integrationRuleIds = await this.fetchRuleIdsByIntegrationName(
        client,
        searchText,
        resolvedSpace
      );
      const mergedQuery = mergeIdsClause(query, 'document.id', integrationRuleIds);
      const hasIntegrationFilter = Boolean(integrationNames?.length);
      const exactIntegrationRuleIds = hasIntegrationFilter
        ? await this.fetchRuleIdsByExactIntegrationName(client, integrationNames, resolvedSpace)
        : [];
      const searchBody: any = {
        from,
        size,
        track_total_hits: true,
        query: this.buildQuery(prePackaged, mergedQuery, space, {
          status,
          integrationIds: hasIntegrationFilter ? exactIntegrationRuleIds : undefined,
          levels,
        }),
      };
      if (sort) searchBody.sort = sort;
      if (_source !== undefined) searchBody._source = _source;
      const searchResponse = await client('search', {
        index: CONTENT_INDICES.RULES,
        body: searchBody,
      });

      const ruleHits = searchResponse?.hits?.hits || [];
      const ruleIds = ruleHits.map((hit: any) => hit._source?.document?.id || hit.document?.id);
      const integrationMap = await this.fetchIntegrationMap(client, ruleIds, resolvedSpace);
      const enrichedHits = ruleHits.map((hit: any) => ({
        ...hit,
        integration: integrationMap.get(hit._source?.document?.id || hit.document?.id) || null,
      }));

      const enrichedResponse = {
        ...searchResponse,
        hits: {
          ...searchResponse.hits,
          hits: enrichedHits,
        },
      };

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: enrichedResponse,
        },
      });
    } catch (error: any) {
      console.error('Ruleset management - RulesService - getRules:', error);
      return response.custom({
        statusCode: 200,
        body: { ok: false, error: extractErrorMessage(error) },
      });
    }
  };

  createRule = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<any> | ResponseError>> => {
    try {
      const { document: rule, integrationId } = request.body as {
        document: Rule;
        integrationId: string;
      };
      if (!rule)
        return response.custom({
          statusCode: 200,
          body: { ok: false, error: 'Rule document is required' },
        });

      const client = this.getClient(request);

      const createResponse = await client(CLIENT_RULE_METHODS.CREATE_RULE, {
        body: {
          resource: this.buildRuleResource(rule),
          integration: integrationId,
        },
      });

      return response.custom({
        statusCode: 200,
        body: { ok: true, response: createResponse },
      });
    } catch (error: any) {
      console.error('Ruleset management - RulesService - createRule:', error);
      return response.custom({
        statusCode: 200,
        body: { ok: false, error: extractErrorMessage(error) },
      });
    }
  };

  updateRule = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<any> | ResponseError>> => {
    try {
      const { ruleId } = request.params as { ruleId: string };
      const { document: rule } = request.body as { document: Rule };
      if (!rule)
        return response.custom({
          statusCode: 200,
          body: { ok: false, error: 'Rule document is required' },
        });

      const client = this.getClient(request);
      const updateResponse = await client(CLIENT_RULE_METHODS.UPDATE_RULE, {
        ruleId,
        body: { resource: this.buildRuleResource(rule) },
      });

      return response.custom({
        statusCode: 200,
        body: { ok: true, response: updateResponse },
      });
    } catch (error: any) {
      console.error('Ruleset management - RulesService - updateRule:', error);
      return response.custom({
        statusCode: 200,
        body: { ok: false, error: extractErrorMessage(error) },
      });
    }
  };

  deleteRule = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<DeleteRuleParams, {}>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<DeleteRuleResponse> | ResponseError>> => {
    try {
      const { ruleId } = request.params;
      const client = this.getClient(request);
      await client(CLIENT_RULE_METHODS.DELETE_RULE, { ruleId });
      // Wazuh: force the index to refresh so the immediate post-delete reload doesn't race OpenSearch's refresh_interval.
      await client('indices.refresh', { index: CONTENT_INDICES.RULES });

      return response.custom({
        statusCode: 200,
        body: { ok: true, response: {} },
      });
    } catch (error: any) {
      console.error('Ruleset management - RulesService - deleteRule:', error);
      return response.custom({
        statusCode: 200,
        body: { ok: false, error: extractErrorMessage(error) },
      });
    }
  };
}
