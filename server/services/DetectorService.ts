/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  OpenSearchDashboardsRequest,
  OpenSearchDashboardsResponseFactory,
  IOpenSearchDashboardsResponse,
  ResponseError,
  RequestHandlerContext,
} from 'opensearch-dashboards/server';
import {
  CreateDetectorParams,
  CreateDetectorResponse,
  DeleteDetectorParams,
  DeleteDetectorResponse,
  GetDetectorParams,
  GetDetectorResponse,
  SearchDetectorsParams,
  SearchDetectorsResponse,
  UpdateDetectorParams,
  UpdateDetectorResponse,
} from '../models/interfaces';
import { CLIENT_DETECTOR_METHODS, CONTENT_INDICES } from '../utils/constants';
import { extractErrorMessage } from '../utils/helpers';
import { ServerResponse } from '../models/types';
import { Detector } from '../../types';
import { MDSEnabledClientService } from './MDSEnabledClientService';

export default class DetectorService extends MDSEnabledClientService {
  // Wazuh: detectors only carry their integration's name (`detector_type`), not its
  // id — resolve it here (one batch query keyed by title, space-scoped) so
  // IntegrationCell can use the same id-based lookup as Rules/Decoders/KVDBs.
  private async resolveIntegrationIds(
    client: any,
    hits: Array<{ _source?: { detector_type?: string } }>
  ): Promise<Map<string, string>> {
    const titles = Array.from(
      new Set(hits.map((hit) => hit._source?.detector_type).filter((title): title is string => !!title))
    );
    const map = new Map<string, string>();
    if (!titles.length) return map;

    try {
      const response = await client('search', {
        index: CONTENT_INDICES.INTEGRATIONS,
        body: {
          size: 10000,
          query: { terms: { 'document.metadata.title': titles } },
          _source: ['document.id', 'document.metadata.title', 'space.name'],
        },
      });
      (response?.hits?.hits ?? []).forEach((hit: any) => {
        const id = hit._source?.document?.id;
        const title = hit._source?.document?.metadata?.title;
        const space = hit._source?.space?.name;
        if (id && title && space) {
          map.set(`${String(space).toLowerCase()}::${title}`, id);
        }
      });
    } catch (error: any) {
      console.warn('Security Analytics - DetectorService - resolveIntegrationIds:', error);
    }

    return map;
  }

  /**
   * Calls backend POST Detectors API.
   */
  createDetector = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<
    IOpenSearchDashboardsResponse<ServerResponse<CreateDetectorResponse> | ResponseError>
  > => {
    try {
      const detector = request.body as Detector;
      const params: CreateDetectorParams = { body: detector };
      const client = this.getClient(request, context);
      const createDetectorResponse: CreateDetectorResponse = await client(
        CLIENT_DETECTOR_METHODS.CREATE_DETECTOR,
        params
      );

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: createDetectorResponse,
        },
      });
    } catch (error: any) {
      console.error('Security Analytics - DetectorsService - createDetector:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: extractErrorMessage(error),
        },
      });
    }
  };

  /**
   * Calls backend GET Detector API.
   */
  getDetector = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<
    IOpenSearchDashboardsResponse<ServerResponse<GetDetectorResponse> | ResponseError>
  > => {
    try {
      const { detectorId } = request.params as { detectorId: string };
      const params: GetDetectorParams = { detectorId };
      const client = this.getClient(request, context);
      const getDetectorResponse: GetDetectorResponse = await client(
        CLIENT_DETECTOR_METHODS.GET_DETECTOR,
        params
      );

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: getDetectorResponse,
        },
      });
    } catch (error: any) {
      console.error('Security Analytics - DetectorsService - getDetector:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: extractErrorMessage(error),
        },
      });
    }
  };

  /**
   * Calls backend Search Detector API.
   */
  searchDetectors = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<
    IOpenSearchDashboardsResponse<ServerResponse<SearchDetectorsResponse> | ResponseError>
  > => {
    try {
      const { query, size } = request.body as { query: object; size?: number };
      const params: SearchDetectorsParams = {
        body: { size: size ?? 10000, query },
      };
      const client = this.getClient(request, context);
      const searchDetectorResponse: SearchDetectorsResponse = await client(
        CLIENT_DETECTOR_METHODS.SEARCH_DETECTORS,
        params
      );

      const hits = searchDetectorResponse?.hits?.hits ?? [];
      const integrationIds = await this.resolveIntegrationIds(client, hits);
      const enrichedHits = hits.map((hit) => {
        const space = (hit._source?.source || '').toLowerCase();
        const title = hit._source?.detector_type;
        const integrationId = title ? integrationIds.get(`${space}::${title}`) : undefined;
        return { ...hit, integrationId };
      });

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: {
            ...searchDetectorResponse,
            hits: { ...searchDetectorResponse.hits, hits: enrichedHits },
          },
        },
      });
    } catch (error: any) {
      console.error('Security Analytics - DetectorsService - searchDetectors:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: extractErrorMessage(error),
        },
      });
    }
  };

  /**
   * Calls backend DELETE Detector API.
   */
  deleteDetector = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<
    IOpenSearchDashboardsResponse<ServerResponse<DeleteDetectorResponse> | ResponseError>
  > => {
    try {
      const { detectorId } = request.params as { detectorId: string };
      const params: DeleteDetectorParams = { detectorId };
      const client = this.getClient(request, context);
      const deleteDetectorResponse: DeleteDetectorResponse = await client(
        CLIENT_DETECTOR_METHODS.DELETE_DETECTOR,
        params
      );

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: deleteDetectorResponse,
        },
      });
    } catch (error: any) {
      console.error('Security Analytics - DetectorsService - deleteDetector:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: extractErrorMessage(error),
        },
      });
    }
  };

  /**
   * Calls backend PUT Detectors API.
   */
  updateDetector = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<
    IOpenSearchDashboardsResponse<ServerResponse<UpdateDetectorResponse> | ResponseError>
  > => {
    try {
      const detector = request.body as Detector;
      const { detectorId } = request.params as { detectorId: string };
      const params: UpdateDetectorParams = { body: detector, detectorId };
      const client = this.getClient(request, context);
      const updateDetectorResponse: UpdateDetectorResponse = await client(
        CLIENT_DETECTOR_METHODS.UPDATE_DETECTOR,
        params
      );

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: updateDetectorResponse,
        },
      });
    } catch (error: any) {
      console.error('Security Analytics - DetectorsService - updateDetector:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: extractErrorMessage(error),
        },
      });
    }
  };
}
