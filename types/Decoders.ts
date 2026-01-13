/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DecoderDocumentAuthor {
  name?: string;
  email?: string;
  url?: string;
  date?: string;
}

export interface DecoderDocumentMetadata {
  title?: string;
  module?: string;
  compatibility?: string;
  versions?: string;
  description?: string;
  author?: DecoderDocumentAuthor;
}

export interface DecoderDocument {
  id: string;
  name: string;
  metadata?: DecoderDocumentMetadata;
  space?: string;
}

export interface DecoderSource {
  document: DecoderDocument;
  decoder?: string;
  space?: string;
}

export interface DecoderItem extends DecoderSource {
  id: string;
  integrations?: string[];
}

export interface SearchDecodersResponse {
  total: number;
  items: DecoderItem[];
}

export interface GetDecoderResponse {
  item?: DecoderItem;
}
