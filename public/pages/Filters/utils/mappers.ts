/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { FilterDocument, FilterResource } from '../../../../types/Filters';
import { dump } from 'js-yaml';

export interface FilterFormModel {
  name: string;
  type: string;
  check: string;
  enabled: boolean;
  author: string;
  description: string;
  documentation: string;
  references: string[];
  supports: string[];
}

export const filterFormDefaultValue: FilterFormModel = {
  name: '',
  type: 'pre-filter',
  check: '',
  enabled: true,
  author: '',
  description: '',
  documentation: '',
  references: [],
  supports: [],
};

export const filterFormDefaultYaml: string = (() => {
  const now = new Date().toISOString().split('T')[0];
  return dump({
    name: 'filter/<name>/<version>',
    type: 'pre-filter',
    check: '',
    enabled: true,
    metadata: {
      author: '',
      description: '',
      documentation: '',
      references: [],
      supports: [],
    },
  });
})();

export const mapYamlToFilterForm = (yamlObj: any): FilterFormModel => {
  const author = yamlObj?.metadata?.author;
  return {
    name: yamlObj?.name ?? '',
    type: yamlObj?.type ?? 'pre-filter',
    check: yamlObj?.check ?? '',
    enabled: yamlObj?.enabled ?? true,
    author: typeof author === 'string' ? author : author?.name ?? '',
    description: yamlObj?.metadata?.description ?? '',
    documentation: yamlObj?.metadata?.documentation ?? '',
    references: yamlObj?.metadata?.references ?? [],
    supports: yamlObj?.metadata?.supports ?? [],
  };
};

export const mapFilterToForm = (document: FilterDocument): FilterFormModel => {
  const author = document.metadata?.author;
  return {
    name: document.name ?? '',
    type: document.type ?? '',
    check: document.check ?? '',
    enabled: document.enabled ?? true,
    author: typeof author === 'string' ? author : author?.name ?? '',
    description: document.metadata?.description ?? '',
    documentation: document.metadata?.documentation ?? '',
    references: document.metadata?.references ?? [],
    supports: document.metadata?.supports ?? [],
  };
};

export const mapFormToFilterResource = (values: FilterFormModel): FilterResource => {
  const now = new Date().toISOString();
  return {
    name: values.name,
    type: values.type,
    check: values.check,
    enabled: values.enabled,
    metadata: {
      title: values.name,
      author: values.author?.trim() ?? '',
      date: now,
      modified: now,
      description: values.description || '',
      documentation: values.documentation || '',
      references: values.references,
      supports: values.supports,
    },
  };
};
