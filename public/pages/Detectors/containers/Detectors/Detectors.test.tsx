/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import props from '../../../../../test/mocks/Detectors/containers/Detectors/Detectors.mock';
import { expect } from '@jest/globals';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import Detectors from './Detectors';
import { coreContextMock } from '../../../../../test/mocks/useContext.mock';
import { setupCoreStart } from '../../../../../test/utils/helpers';

beforeAll(() => {
  setupCoreStart();
});

describe('<Detectors /> spec', () => {
  it('renders the component', async () => {
    let wrapper;
    await act(async () => {
      Detectors.contextType = React.createContext(coreContextMock);
      wrapper = await mount(<Detectors {...props} />);
    });
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
  });

  it('renders the Integration column as a clickable IntegrationCell CTA', async () => {
    let wrapper;
    await act(async () => {
      Detectors.contextType = React.createContext(coreContextMock);
      wrapper = await mount(<Detectors {...props} />);
    });
    wrapper.update();
    expect(wrapper!.find('[data-test-subj="integrationCellLink"]').length).toBeGreaterThan(0);
  });

  it('passes currentEntity="detectors" to its own IntegrationCell so the Detectors link is hidden', async () => {
    let wrapper;
    await act(async () => {
      Detectors.contextType = React.createContext(coreContextMock);
      wrapper = await mount(<Detectors {...props} />);
    });
    wrapper.update();
    const cell = wrapper!.find('IntegrationCell').first();
    expect(cell.prop('currentEntity')).toBe('detectors');
  });

  describe('Integration CTA deep-link (?integration=<name>)', () => {
    const buildHistoryProps = (search: string) => {
      const replace = jest.fn();
      const history = {
        replace,
        listen: jest.fn(),
        location: { pathname: '/detectors', search },
        push: jest.fn(),
      } as unknown as typeof props.history;
      return { ...props, history };
    };

    it('seeds an integration clause from ?integration=<name> into the search query', () => {
      const instanceProps = buildHistoryProps('?integration=aws');
      const detectors = new Detectors(instanceProps as any);
      expect((detectors as any).urlFilters.query).toContain('integration=(aws)');
    });

    it('quotes the token when the integration name contains whitespace', () => {
      const instanceProps = buildHistoryProps('?integration=aws%20waf');
      const detectors = new Detectors(instanceProps as any);
      expect((detectors as any).urlFilters.query).toContain('integration=("aws waf")');
    });

    it('consumes the integration param on mount so it is not re-applied on remount', async () => {
      const instanceProps = buildHistoryProps('?integration=aws');
      let wrapper;
      await act(async () => {
        Detectors.contextType = React.createContext(coreContextMock);
        wrapper = await mount(<Detectors {...instanceProps} />);
      });
      wrapper!.update();

      expect(instanceProps.history!.replace).toHaveBeenCalled();
      const lastCall = (instanceProps.history!.replace as jest.Mock).mock.calls.slice(-1)[0][0];
      expect(String(lastCall.search)).not.toContain('integration=');
    });

    it('is a no-op when no integration param is present (no regression)', () => {
      const instanceProps = buildHistoryProps('');
      const detectors = new Detectors(instanceProps as any);
      expect((detectors as any).urlFilters.query).toBe('');
    });
  });

  describe('space filter URL persistence (?space=<value>)', () => {
    const buildHistoryProps = (search: string) => {
      const replace = jest.fn();
      const history = {
        replace,
        listen: jest.fn(),
        location: { pathname: '/detectors', search },
        push: jest.fn(),
      } as unknown as typeof props.history;
      return { ...props, history };
    };

    it('reads the space value from the URL into urlFilters.space', () => {
      const instanceProps = buildHistoryProps('?space=draft');
      const detectors = new Detectors(instanceProps as any);
      expect((detectors as any).urlFilters.space).toBe('draft');
    });

    it('splits the space clause out of the search text instead of leaking it into query', () => {
      const instanceProps = buildHistoryProps('');
      const detectors = new Detectors(instanceProps as any);
      (detectors as any).onSearchChange({ query: { text: 'aws space=draft' } });
      expect(instanceProps.history!.replace).toHaveBeenCalled();
      const lastCall = (instanceProps.history!.replace as jest.Mock).mock.calls.slice(-1)[0][0];
      const params = new URLSearchParams(String(lastCall.search));
      expect(params.get('space')).toBe('draft');
      expect(params.get('query')).toBe('aws');
    });
  });

  describe('search bar filters — Integration filter migrated to buildStatusIntegrationFilters', () => {
    const getSearchFilters = async () => {
      let wrapper;
      await act(async () => {
        Detectors.contextType = React.createContext(coreContextMock);
        wrapper = await mount(<Detectors {...props} />);
      });
      wrapper!.update();
      return wrapper!.find('EuiSearchBar').first().prop('filters') as any[];
    };

    it('targets `integration` for the Integration filter, matching Rules/Decoders/KVDBs', async () => {
      const filters = await getSearchFilters();
      const integrationFilter = filters.find((f) => f.name === 'Integration');
      expect(integrationFilter).toMatchObject({
        type: 'field_value_selection',
        field: 'integration',
        multiSelect: 'or',
        operator: 'exact',
        compressed: true,
      });
    });

    it("keeps the Status filter's own data-derived options — no Enabled/Disabled leak from the shared helper", async () => {
      const filters = await getSearchFilters();
      const statusFilter = filters.find((f) => f.name === 'Status');
      const statusValues = statusFilter.options.map((o: any) => o.value);
      expect(statusValues).not.toEqual(expect.arrayContaining(['enabled', 'disabled']));
    });

    it('keeps the Status, Integration, Space filter order unchanged', async () => {
      const filters = await getSearchFilters();
      expect(filters.map((f) => f.name)).toEqual(['Status', 'Integration', 'Space']);
    });

    it('keeps the `space` filter inline and unchanged', async () => {
      const filters = await getSearchFilters();
      const spaceFilter = filters.find((f) => f.name === 'Space');
      expect(spaceFilter).toMatchObject({
        type: 'field_value_selection',
        field: 'space',
        multiSelect: 'or',
        operator: 'exact',
        compressed: true,
      });
    });
  });
});
