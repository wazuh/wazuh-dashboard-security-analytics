/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render } from '@testing-library/react';
import { usePreselectedIntegration } from './usePreselectedIntegration';
import { IntegrationOption } from './useIntegrationSelector';

const OPTIONS: IntegrationOption[] = [
  { id: 'id-syslog', value: 'syslog', label: 'syslog' },
  { id: 'id-windows', value: 'windows', label: 'windows' },
];

const Harness: React.FC<{
  search?: string;
  options: IntegrationOption[];
  isLoading: boolean;
  enabled?: boolean;
  onPreselect: (option: IntegrationOption) => void;
}> = (props) => {
  usePreselectedIntegration(props);
  return null;
};

describe('usePreselectedIntegration', () => {
  const setup = (props: Partial<React.ComponentProps<typeof Harness>> = {}) => {
    const onPreselect = jest.fn();
    const { rerender } = render(
      <Harness options={OPTIONS} isLoading={false} onPreselect={onPreselect} {...props} />
    );
    return {
      onPreselect,
      rerender: (next: Partial<React.ComponentProps<typeof Harness>>) =>
        rerender(
          <Harness
            options={OPTIONS}
            isLoading={false}
            onPreselect={onPreselect}
            {...props}
            {...next}
          />
        ),
    };
  };

  it('preselects the integration named by the query param', () => {
    const { onPreselect } = setup({ search: '?integration=windows' });

    expect(onPreselect).toHaveBeenCalledTimes(1);
    expect(onPreselect).toHaveBeenCalledWith(OPTIONS[1]);
  });

  it('accepts an integration id as well as a title', () => {
    const { onPreselect } = setup({ search: '?integration=id-syslog' });

    expect(onPreselect).toHaveBeenCalledWith(OPTIONS[0]);
  });

  it('decodes a name with special characters', () => {
    const options = [{ id: 'id-a', value: 'my integration & co', label: 'my integration & co' }];
    const { onPreselect } = setup({
      search: `?integration=${encodeURIComponent('my integration & co')}`,
      options,
    });

    expect(onPreselect).toHaveBeenCalledWith(options[0]);
  });

  it('does nothing without the query param', () => {
    const { onPreselect } = setup({ search: '?space=draft' });

    expect(onPreselect).not.toHaveBeenCalled();
  });

  it('does nothing when the query param matches no integration', () => {
    const { onPreselect } = setup({ search: '?integration=unknown' });

    expect(onPreselect).not.toHaveBeenCalled();
  });

  it('waits for the options to load', () => {
    const { onPreselect, rerender } = setup({
      search: '?integration=syslog',
      isLoading: true,
      options: [],
    });
    expect(onPreselect).not.toHaveBeenCalled();

    rerender({ isLoading: false, options: OPTIONS });
    expect(onPreselect).toHaveBeenCalledWith(OPTIONS[0]);
  });

  it('does not run when disabled', () => {
    const { onPreselect } = setup({ search: '?integration=syslog', enabled: false });

    expect(onPreselect).not.toHaveBeenCalled();
  });

  it('only preselects once, so a later options refresh cannot overwrite the user choice', () => {
    const { onPreselect, rerender } = setup({ search: '?integration=syslog' });
    expect(onPreselect).toHaveBeenCalledTimes(1);

    rerender({ options: [...OPTIONS, { id: 'id-new', value: 'new', label: 'new' }] });
    expect(onPreselect).toHaveBeenCalledTimes(1);
  });
});
