/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
*/

export interface KVDBDocument {
  id: string;
  title?: string;
  name?: string;
  author?: string;
  enabled?: boolean;
  references?: string[] | string;
  date?: string;
  content?: any;
  metadata?: {
    author?: {
      url?: string;
      name?: string;
      email?: string;
      date?: string;
    };
  };
}

export interface KVDBSource {
  document: KVDBDocument;
  space?: string | { name?: string };
}

export interface KVDBIntegrationSource {
  document?: {
    id?: string;
    title?: string;
    kvdbs?: string[] | string;
  };
}

export interface KVDBIntegrationSummary {
  id?: string;
  title?: string;
}

export interface KVDBItem extends KVDBSource {
  id: string;
  integration?: KVDBIntegrationSummary;
}

export interface KVDBSearchRequest {
  from?: number;
  size?: number;
  sort?: Array<Record<string, { order: "asc" | "desc" }>>;
  query?: any;
  _source?: any;
  track_total_hits?: boolean;
}

export interface KVDBSearchResponse {
  hits: {
    total?: { value: number } | number;
    hits: {
      _id: string;
      _source: KVDBSource;
    }[];
  };
}

export interface KVDBIntegrationsSearchResponse {
  hits: {
    hits: {
      _id: string;
      _source: KVDBIntegrationSource;
    }[];
  };
}
