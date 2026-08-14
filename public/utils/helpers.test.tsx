/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { getLogTypeFilterOptions, getLogTypeFilterOptionsFlat } from './helpers';
import { logTypeCategories, logTypesByCategories } from './constants';
import { LogType } from '../../types';

const seedLogTypes = () => {
  // Wazuh: logTypeCategories/logTypesByCategories are populated at runtime by
  // LogTypeStore — seed them directly here to exercise
  // getLogTypeFilterOptions()/getLogTypeFilterOptionsFlat() in isolation.
  logTypeCategories.length = 0;
  logTypeCategories.push('security', 'network');

  Object.keys(logTypesByCategories).forEach((key) => delete logTypesByCategories[key]);
  logTypesByCategories.security = [
    { id: '1', name: 'windows', description: '', source: '', category: 'security', tags: null },
    { id: '2', name: 'linux', description: '', source: '', category: 'security', tags: null },
  ] as LogType[];
  logTypesByCategories.network = [
    { id: '3', name: 'dns', description: '', source: '', category: 'network', tags: null },
  ] as LogType[];
};

describe('getLogTypeFilterOptionsFlat', () => {
  beforeEach(() => {
    seedLogTypes();
  });

  it('returns plain { value, name } options with no category grouping', () => {
    const options = getLogTypeFilterOptionsFlat();

    expect(options.length).toBe(3);
    options.forEach((option) => {
      expect(Object.keys(option).sort()).toEqual(['name', 'value']);
      expect(typeof option.value).toBe('string');
      expect(typeof option.name).toBe('string');
    });
  });

  it('dedups by value across categories', () => {
    logTypesByCategories.network.push({
      id: '4',
      name: 'windows',
      description: '',
      source: '',
      category: 'network',
      tags: null,
    } as LogType);

    const options = getLogTypeFilterOptionsFlat();
    const values = options.map((option) => option.value);

    expect(values.filter((value) => value === 'windows').length).toBe(1);
  });

  it('produces the same option values/names as the grouped getLogTypeFilterOptions(), minus grouping', () => {
    const flatOptions = getLogTypeFilterOptionsFlat();
    const groupedOptions = getLogTypeFilterOptions();

    expect(flatOptions.map((option) => option.value).sort()).toEqual(
      groupedOptions.map((option) => option.value).sort()
    );
    // The grouped variant renders a `view` node instead of a plain `name` string.
    groupedOptions.forEach((option) => {
      expect(option).toHaveProperty('view');
      expect(option).not.toHaveProperty('name');
    });
  });
});
