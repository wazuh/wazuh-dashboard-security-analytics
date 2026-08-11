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

    it('seeds a logType clause from ?integration=<name> into the search query', () => {
      const instanceProps = buildHistoryProps('?integration=aws');
      const detectors = new Detectors(instanceProps as any);
      expect((detectors as any).urlFilters.query).toContain('logType=(aws)');
    });

    it('quotes the token when the integration name contains whitespace', () => {
      const instanceProps = buildHistoryProps('?integration=aws%20waf');
      const detectors = new Detectors(instanceProps as any);
      expect((detectors as any).urlFilters.query).toContain('logType=("aws waf")');
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
});
