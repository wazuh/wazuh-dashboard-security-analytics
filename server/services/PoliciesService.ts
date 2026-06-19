/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  IOpenSearchDashboardsResponse,
  OpenSearchDashboardsRequest,
  OpenSearchDashboardsResponseFactory,
  RequestHandlerContext,
  ResponseError,
} from 'opensearch-dashboards/server';
import { ServerResponse } from '../models/types';
import {
  PolicyItem,
  GetPolicyResponse,
  SearchPoliciesResponse,
  UpdatePolicyRequestBody,
} from '../../types';
import { MDSEnabledClientService } from './MDSEnabledClientService';
import { CLIENT_POLICY_METHODS, CONTENT_INDICES } from '../utils/constants';

const SPACE_FIELD_CANDIDATES = [
  'space.keyword',
  'space',
  'space.name.keyword',
  'space.name',
  'document.space.keyword',
  'document.space',
  'document.space.name.keyword',
  'document.space.name',
];

interface SpaceFieldCaps {
  searchFields: string[];
  aggFields: string[];
}

export class PoliciesService extends MDSEnabledClientService {
  private spaceFieldCaps?: SpaceFieldCaps;
  private spaceFieldCapsPromise?: Promise<SpaceFieldCaps>;

  private async getSpaceFieldCaps(client: any): Promise<SpaceFieldCaps> {
    if (this.spaceFieldCaps) {
      return this.spaceFieldCaps;
    }

    if (!this.spaceFieldCapsPromise) {
      this.spaceFieldCapsPromise = (async () => {
        try {
          const fieldCapsResponse = await client('fieldCaps', {
            index: CONTENT_INDICES.POLICIES,
            fields: SPACE_FIELD_CANDIDATES,
          });
          const fields = fieldCapsResponse?.fields ?? {};
          const searchFields: string[] = [];
          const aggFields: string[] = [];
          SPACE_FIELD_CANDIDATES.forEach((field) => {
            const types = fields[field];
            if (!types) {
              return;
            }
            const entries = Object.entries(types) as Array<
              [string, { searchable?: boolean; aggregatable?: boolean }]
            >;
            const isSearchable = entries.some(
              ([type, meta]) => meta?.searchable && type !== 'object' && type !== 'nested'
            );
            const isAggregatable = entries.some(
              ([type, meta]) => meta?.aggregatable && type !== 'object' && type !== 'nested'
            );
            if (isSearchable) {
              searchFields.push(field);
            }
            if (isAggregatable) {
              aggFields.push(field);
            }
          });

          const result = {
            searchFields: searchFields.length ? searchFields : SPACE_FIELD_CANDIDATES,
            aggFields: aggFields.length ? aggFields : SPACE_FIELD_CANDIDATES,
          };
          this.spaceFieldCaps = result;
          return result;
        } catch (error: any) {
          console.warn('Security Analytics - PoliciesService - fieldCaps:', error?.message);
        }

        const fallback = {
          searchFields: SPACE_FIELD_CANDIDATES,
          aggFields: SPACE_FIELD_CANDIDATES,
        };
        this.spaceFieldCaps = fallback;
        return fallback;
      })();
    }

    return this.spaceFieldCapsPromise;
  }

  private buildSpaceFilter(space: string, fields: string[]) {
    return {
      bool: {
        should: fields.map((field) => ({ term: { [field]: space } })),
        minimum_should_match: 1,
      },
    };
  }

  private applySpaceFilter(query: any, space: string | undefined, fields: string[]) {
    if (!space) {
      return query ?? { match_all: {} };
    }

    const spaceFilter = this.buildSpaceFilter(space, fields);

    if (!query || Object.keys(query).length === 0) {
      return { bool: { filter: [spaceFilter] } };
    }

    if (query.bool) {
      const { filter, ...restBool } = query.bool;
      const existingFilter = Array.isArray(filter) ? filter : filter ? [filter] : [];
      return {
        bool: {
          ...restBool,
          filter: [...existingFilter, spaceFilter],
        },
      };
    }

    return {
      bool: {
        must: [query],
        filter: [spaceFilter],
      },
    };
  }

  private async fetchIntegrationMap(
    client: any,
    space: string,
    integrationsIds: string[],
    options?: {
      _source?: string[];
      from?: number;
      size?: number;
      sort?: any;
      query?: any;
    }
  ): Promise<{ integrations: Map<string, any>; total: number }> {
    if (!integrationsIds.length) {
      return { integrations: new Map(), total: 0 };
    }

    const idsFilter = { terms: { 'document.id': integrationsIds } };
    const baseQuery = options?.query
      ? { bool: { must: [idsFilter, options.query] } }
      : idsFilter;

    const spaceSearchFields = (await this.getSpaceFieldCaps(client)).searchFields;
    const query = this.applySpaceFilter(baseQuery, space, spaceSearchFields);

    try {
      const integrationResponse = await client('search', {
        index: CONTENT_INDICES.INTEGRATIONS,
        body: {
          from: options?.from ?? 0,
          size: options?.size ?? integrationsIds.length,
          sort: options?.sort,
          track_total_hits: true,
          query,
          _source: options?._source ?? {
            includes: [
              'document.id',
              'document.metadata.title',
              'document.metadata.description',
              'document.category',
              'document.rules',
              'document.decoders',
              'document.kvdbs',
              'space.name',
            ],
          },
        },
      });

      const hits = integrationResponse?.hits?.hits ?? [];
      const total =
        typeof integrationResponse?.hits?.total === 'number'
          ? integrationResponse.hits.total
          : integrationResponse?.hits?.total?.value ?? hits.length;

      const integrations = new Map(
        hits.map((hit: any) => [
          hit?._source?.document?.id,
          { _id: hit._id, ...hit._source },
        ])
      );

      return { integrations, total };
    } catch (error: any) {
      console.warn('Security Analytics - PoliciesService - fetchIntegrationMap:', error?.message);
      return { integrations: new Map(), total: 0 };
    }
  }

  searchPolicies = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<
    IOpenSearchDashboardsResponse<ServerResponse<SearchPoliciesResponse> | ResponseError>
  > => {
    try {
      const body = (request.body as any) ?? {};
      const space = (request.query as { space?: string })?.space;
      const {
        from = 0,
        size = 25,
        sort,
        query,
        _source,
        includeIntegrationFields,
        includeIntegrationsMap = true,
        integrationFrom = 0,
        integrationSize,
        integrationSort,
        integrationQuery,
      } = body;
      const client = this.getClient(request, context);
      const { searchFields } = await this.getSpaceFieldCaps(client);
      const searchResponse = await client('search', {
        index: CONTENT_INDICES.POLICIES,
        body: {
          from,
          size,
          sort,
          track_total_hits: true,
          _source: _source === undefined ? { includes: ['document', 'space'] } : _source,
          query: this.applySpaceFilter(query, space, searchFields),
        },
      });

      const hits = searchResponse?.hits?.hits ?? [];
      const integrationsIds = [
        ...hits.map((hit: any) => hit?._source?.document?.integrations),
      ].flat();
      const { integrations: integrationMap, total: integrationsTotal } =
        await this.fetchIntegrationMap(client, space, integrationsIds, {
          _source: includeIntegrationFields,
          from: integrationFrom,
          size: integrationSize,
          sort: integrationSort,
          query: integrationQuery,
        });

      const transformToCounts = !includeIntegrationFields;
      const items: PolicyItem[] = hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source,
        integrationsTotal,
        integrationsMap: Object.fromEntries(
          Array.from(integrationMap.entries()).map(([documentId, integration]) => {
            if (!transformToCounts) {
              return [documentId, integration];
            }
            const doc = integration.document ?? {};
            return [
              documentId,
              {
                _id: integration._id,
                document: {
                  metadata: doc.metadata ?? {},
                  category: doc.category ?? '',
                  rulesCount: doc.rules?.length ?? 0,
                  decodersCount: doc.decoders?.length ?? 0,
                  kvdbsCount: doc.kvdbs?.length ?? 0,
                },
                space: integration.space ?? {},
              },
            ];
          })
        ),
      }));
      const total =
        typeof searchResponse?.hits?.total === 'number'
          ? searchResponse.hits.total
          : searchResponse?.hits?.total?.value ?? items.length;

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: {
            total,
            items,
          },
        },
      });
    } catch (error: any) {
      console.error('Security Analytics - PoliciesService - searchPolicies:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: error.message,
        },
      });
    }
  };

  getPolicy = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<{ policyId: string }>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<GetPolicyResponse> | ResponseError>> => {
    try {
      const { policyId } = request.params;
      const space = (request.query as { space?: string })?.space;
      const client = this.getClient(request, context);
      const { searchFields } = await this.getSpaceFieldCaps(client);
      const query = {
        index: CONTENT_INDICES.POLICIES,
        body: {
          size: 1,
          query: this.applySpaceFilter({ ids: { values: [policyId] } }, space, searchFields),
        },
      };

      const searchResponse = await client('search', query);

      const hit = searchResponse?.hits?.hits?.[0];
      if (!hit) {
        return response.custom({
          statusCode: 200,
          body: {
            ok: false,
            error: 'Policy not found',
          },
        });
      }

      const integrationMap = await this.fetchIntegrationMap(client, [hit._id]);
      const item: PolicyItem = {
        id: hit._id,
        ...hit._source,
        integrations: integrationMap.get(hit._id) ?? [],
      };

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: {
            item,
          },
        },
      });
    } catch (error: any) {
      console.error('Security Analytics - PoliciesService - getPolicy:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: error.message,
        },
      });
    }
  };

  updatePolicy = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<{ space: string }, {}, UpdatePolicyRequestBody>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<GetPolicyResponse> | ResponseError>> => {
    try {
      const { space } = request.params;
      const { body } = request;

      const client = this.getClient(request, context);
      const updatePolicyResponse = await client(CLIENT_POLICY_METHODS.UPDATE_POLICY, {
        space,
        body: {
          resource: body,
        },
      });

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: updatePolicyResponse,
        },
      });
    } catch (error: any) {
      console.error('Security Analytics - PoliciesService - updatePolicy:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: error?.body?.message || error.message,
        },
      });
    }
  };

  deleteSpace = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<{ space: string }>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<null> | ResponseError>> => {
    try {
      const { space } = request.params;
      const client = this.getClient(request, context);

      await client(CLIENT_POLICY_METHODS.DELETE_SPACE, { space });

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: null,
        },
      });
    } catch (error: any) {
      console.error('Security Analytics - PoliciesService - deleteSpace:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: error.body?.message || error.message,
        },
      });
    }
  };
}
