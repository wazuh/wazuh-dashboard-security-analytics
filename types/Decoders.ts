/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { CatalogResourceMetadata } from './ResourceMetadata';

export type DecoderMetadata = CatalogResourceMetadata;

export interface DecoderDocument {
  id: string;
  name: string;
  enabled?: boolean;
  metadata: DecoderMetadata;
  definitions?: Record<string, unknown>;
  /** Either a conditional expression or a list of `{ field: condition }` items. */
  check?: string | Array<Record<string, unknown>>;
  parents?: string[];
  /** Sequential sub-stages, each combining `check`, `parse|<field>` and `map`. */
  normalize?: Array<Record<string, unknown>>;
  // The schema also allows top-level `parse|<field>` keys alongside `normalize`.
  // They are not declared here: a template-literal index signature is not parseable
  // by the prettier version this repo formats with (2.1.1, which predates TS 4.4),
  // and a plain `[key: string]: unknown` would silence real typos everywhere this
  // type is used. The decoder editor's mappers handle those keys explicitly and
  // cover them with a round-trip test instead.
}

export interface DecoderSource {
  document: DecoderDocument;
  yaml?: string;
  space?: string;
}

export interface DecoderItem extends DecoderSource {
  id: string;
  integrations?: string[];
  /** Same integrations as `integrations`, with their id — for a direct lookup by id. */
  integrationRefs?: Array<{ id: string }>;
}

export interface SearchDecodersResponse {
  total: number;
  items: DecoderItem[];
}

export interface GetDecoderResponse {
  item?: DecoderItem;
}

export interface CUDDecoderResponse {
  message: string;
  status: number;
  error: string | null;
}
