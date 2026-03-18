/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { FilterDocument, FilterResource } from "../../../../types/Filters";

export interface FilterFormModel {
  name: string;
  type: string;
  check: string;
  enabled: boolean;
  description: string;
  authorName: string;
  authorEmail: string;
  authorUrl: string;
}

export const filterFormDefaultValue: FilterFormModel = {
  name: "",
  type: "pre-filter",
  check: "",
  enabled: true,
  description: "",
  authorName: "",
  authorEmail: "",
  authorUrl: "",
};

export const mapFilterToForm = (document: FilterDocument): FilterFormModel => {
  const author = document.metadata?.author;
  return {
    name: document.name ?? "",
    type: document.type ?? "",
    check: document.check ?? "",
    enabled: document.enabled ?? true,
    description: document.metadata?.description ?? "",
    authorName: typeof author === "string" ? author : (author?.name ?? ""),
    authorEmail: typeof author === "object" ? (author?.email ?? "") : "",
    authorUrl: typeof author === "object" ? (author?.url ?? "") : "",
  };
};

export const mapFormToFilterResource = (
  values: FilterFormModel,
): FilterResource => {
  const now = new Date().toISOString();
  return {
    name: values.name,
    type: values.type,
    check: values.check,
    enabled: values.enabled,
    metadata: {
      title: values.name,
      author: values.authorName?.trim() ?? "",
      date: now,
      modified: now,
      description: values.description || "",
      references: [],
      documentation: "",
      supports: [],
    },
  };
};
