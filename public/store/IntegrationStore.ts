/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotificationsStart } from 'opensearch-dashboards/public';
import {
  GetPromote,
  GetPromoteBySpaceResponse,
  Integration,
  IntegrationBase,
  PromoteIntegrationRequestBody,
  PromoteSpaces,
} from '../../types';
import IntegrationService from '../services/IntegrationService';
import { errorNotificationToast, getErrorMessage } from '../utils/helpers';
import { ruleTypes } from '../pages/Rules/utils/constants';
import {
  DATA_SOURCE_NOT_SET_ERROR,
  integrationCategoryFilters,
  integrationsByCategories,
} from '../utils/constants';

export class IntegrationStore {
  constructor(private service: IntegrationService, private notifications: NotificationsStart) {}

  private formatRelatedEntitiesList(entities: string[]): string {
    if (entities.length === 0) {
      return 'related entities';
    }

    if (entities.length === 1) {
      return entities[0];
    }

    if (entities.length === 2) {
      return `${entities[0]} and ${entities[1]}`;
    }

    return `${entities.slice(0, -1).join(', ')}, and ${entities[entities.length - 1]}`;
  }

  public async getIntegration(
    id: string,
    spaceFilter?: string | null
  ): Promise<Integration | undefined> {
    const integrationsRes = await this.service.searchIntegrations({
      id,
      spaceFilter,
    });
    if (integrationsRes.ok) {
      const integrations: Integration[] = integrationsRes.response.hits.hits.map((hit) => {
        return {
          id: hit._id,
          ...hit._source,
        };
      });

      return integrations[0];
    }

    return undefined;
  }

  // Wazuh: space-scoped integration listing for the Rules/Decoders/KVDBs
  // EuiSearchBar Integration filter. Deliberately side-effect-free — unlike
  // getIntegrations() below, it must not mutate the shared
  // ruleTypes/integrationCategoryFilters module-level caches those creation-form
  // flows depend on — and requests only the fields it actually needs.
  //
  // `relatedField` (e.g. 'decoders' on the Decoders page) excludes integrations
  // with an empty/missing document.<relatedField> array — filtering by one of
  // those would always resolve to zero results, so there's no reason to offer it.
  public async listIntegrationOptions(
    spaceFilter: string,
    relatedField?: 'decoders' | 'rules' | 'kvdbs'
  ): Promise<Array<{ id: string; title: string }>> {
    const integrationsRes = await this.service.searchIntegrations({
      spaceFilter,
      _source: relatedField
        ? ['document.metadata.title', `document.${relatedField}`]
        : ['document.metadata.title'],
    });
    if (integrationsRes.ok) {
      return integrationsRes.response.hits.hits
        .filter((hit) => !relatedField || (hit._source?.document?.[relatedField]?.length ?? 0) > 0)
        .map((hit) => ({
          id: hit._id,
          title: hit._source?.document?.metadata?.title ?? '',
        }));
    }
    return [];
  }

  public async getIntegrations(spaceFilter: string): Promise<Integration[]> {
    try {
      const integrationsRes = await this.service.searchIntegrations({
        spaceFilter,
      });
      if (integrationsRes.ok) {
        const integrations: Integration[] = integrationsRes.response.hits.hits.map((hit) => {
          return {
            id: hit._id,
            ...hit._source,
            space: hit._source.space,
          };
        });

        ruleTypes.splice(
          0,
          ruleTypes.length,
          ...integrations
            .map(({ id, document: { category, metadata }, space }) => ({
              label: metadata.title ?? '-',
              value: metadata?.title ?? '',
              id,
              category,
              isStandard: space.name === 'Standard',
            }))
            .sort((a, b) => {
              return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
            })
        );

        // Set integration category types
        for (const key in integrationsByCategories) {
          delete integrationsByCategories[key];
        }
        integrations.forEach((integration) => {
          integrationsByCategories[integration.document.category] =
            integrationsByCategories[integration.document.category] || [];
          integrationsByCategories[integration.document.category].push(integration);
        });
        integrationCategoryFilters.splice(
          0,
          integrationCategoryFilters.length,
          ...Object.keys(integrationsByCategories).sort((a, b) => {
            if (a === 'Other') {
              return 1;
            } else if (b === 'Other') {
              return -1;
            } else {
              return a < b ? -1 : a > b ? 1 : 0;
            }
          })
        );

        return integrations;
      }

      return [];
    } catch (error: any) {
      if (error.message === DATA_SOURCE_NOT_SET_ERROR) {
        errorNotificationToast(
          this.notifications,
          'Fetch',
          'Integrations',
          'Select valid data source.'
        );
        return [];
      }

      throw error;
    }
  }

  public async createIntegration(integration: IntegrationBase): Promise<[boolean, string]> {
    try {
      const { document, space } = integration;
      const createRes = await this.service.createIntegration({ document, space });

      if (!createRes.ok) {
        errorNotificationToast(
          this.notifications,
          'create',
          'integration',
          getErrorMessage(createRes.error, 'Failed to create integration.')
        );
        return [false, ''];
      }

      return [true, createRes.response.message];
    } catch (error: unknown) {
      errorNotificationToast(
        this.notifications,
        'create',
        'integration',
        getErrorMessage(error, 'An unexpected error occurred.')
      );
      return [false, ''];
    }
  }

  public async updateIntegration(integrationId: string, document: Integration): Promise<boolean> {
    try {
      const updateRes = await this.service.updateIntegration(integrationId, document);

      if (!updateRes.ok) {
        errorNotificationToast(
          this.notifications,
          'update',
          'integration',
          getErrorMessage(updateRes.error, 'Failed to update integration.')
        );
        return false;
      }

      return true;
    } catch (error: unknown) {
      errorNotificationToast(
        this.notifications,
        'update',
        'integration',
        getErrorMessage(error, 'An unexpected error occurred.')
      );
      return false;
    }
  }

  public async deleteIntegration(id: string) {
    try {
      const deleteRes = await this.service.deleteIntegration(id);

      if (!deleteRes.ok) {
        errorNotificationToast(
          this.notifications,
          'delete',
          'integration',
          getErrorMessage(deleteRes.error, 'Error occurred while deleting integration.')
        );
      }

      return { ok: deleteRes.ok, error: deleteRes.error || null };
    } catch (e: unknown) {
      const msg = getErrorMessage(e, 'An unexpected error occurred.');
      errorNotificationToast(this.notifications, 'delete', 'integration', msg);
      return {
        ok: false,
        error: msg,
      };
    }
  }

  public async getPromote(
    data: GetPromote,
    { showErrorToast = true }: { showErrorToast?: boolean } = {}
  ): Promise<[GetPromoteBySpaceResponse['ok'], GetPromoteBySpaceResponse['response']]> {
    const promoteRes = await this.service.getPromoteIntegration(data);
    if (!promoteRes.ok && showErrorToast) {
      errorNotificationToast(this.notifications, 'promote', 'integration', promoteRes.error);
    }

    return [promoteRes.ok, promoteRes.response];
  }

  public async hasPromotableContentChanges(space: PromoteSpaces): Promise<boolean> {
    try {
      const [ok, data] = await this.getPromote({ space }, { showErrorToast: false });
      if (!ok || !data?.promote?.changes) {
        return false;
      }
      return Object.values(data.promote.changes).some((items) => (items?.length ?? 0) > 0);
    } catch {
      return false;
    }
  }

  public async promoteIntegration(data: PromoteIntegrationRequestBody) {
    const promoteRes = await this.service.promoteIntegration(data);
    if (!promoteRes.ok) {
      errorNotificationToast(this.notifications, 'promote', 'integration', promoteRes.error);
    }

    return [promoteRes.ok, promoteRes.error];
  }

  /**
   * This method checks if an integration can be deleted.
   * An integration can be deleted if it has no associated rules, decoders or KVDB items.
   */
  public canDeleteIntegration(integration: Integration): boolean {
    const rules = (integration as Integration & { rules?: unknown }).rules;
    const decoders = (integration as Integration & { decoders?: unknown }).decoders;
    const kvdbs = (integration as Integration & { kvdbs?: unknown }).kvdbs;
    const rulesCount = Array.isArray(rules) ? rules.length : 0;
    const decodersCount = Array.isArray(decoders) ? decoders.length : 0;
    const kvdbsCount = Array.isArray(kvdbs) ? kvdbs.length : 0;
    return rulesCount === 0 && decodersCount === 0 && kvdbsCount === 0;
  }

  public getRelatedEntitiesMessage({
    hasRules,
    hasDecoders,
    hasKVDBs,
  }: {
    hasRules: boolean;
    hasDecoders: boolean;
    hasKVDBs: boolean;
  }): string {
    const relatedEntities = [
      hasRules ? 'rules' : null,
      hasDecoders ? 'decoders' : null,
      hasKVDBs ? 'KVDBs' : null,
    ].filter(Boolean) as string[];

    return this.formatRelatedEntitiesList(relatedEntities);
  }
}
