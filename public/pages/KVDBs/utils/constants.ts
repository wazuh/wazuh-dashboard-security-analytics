/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const KVDBS_PAGE_SIZE = 25;
export const KVDBS_SORT_FIELD = "document.title";

export const KVDBS_SEARCH_SCHEMA = {
  strict: true,
  fields: {
    "document.author": {
      type: "string",
    },
    "document.date": {
      type: "date",
    },
    "document.enabled": {
      type: "boolean",
    },
    "document.id": {
      type: "string",
    },
    "document.references": {
      type: "string",
    },
    "document.title": {
      type: "string",
    },
  },
};
