/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Shared metadata model for all catalog resources. Contains the common fields
 * that are nested under `document.metadata` in the indexed document.
 *
 * Resource-specific fields:
 * - `compatibility` — used only by Policy resources.
 * - `supports` — used by Integration, Decoder, Rule, KVDB, and Filter resources.
 */
export interface ResourceMetadata {
  title: string;
  author: string;
  date: string;
  modified?: string;
  description: string;
  references: string[];
  documentation: string;
  compatibility?: string[];
  supports?: string[];
}

/**
 * Policy-specific metadata with compatibility field.
 */
export interface PolicyMetadata extends Omit<ResourceMetadata, "supports"> {
  compatibility?: string[];
}

/**
 * Non-policy resource metadata with supports field.
 */
export interface CatalogResourceMetadata extends Omit<
  ResourceMetadata,
  "compatibility"
> {
  supports?: string[];
}
