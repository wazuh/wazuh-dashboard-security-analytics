/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import { IntegrationCell } from './IntegrationCell';
import { ROUTES } from '../../utils/constants';

const renderWithRouter = (name: string) => {
  let currentPath = '';
  render(
    <MemoryRouter initialEntries={['/rules']}>
      <IntegrationCell name={name} />
      <Switch>
        <Route
          path="*"
          render={({ location }) => {
            currentPath = `${location.pathname}${location.search}`;
            return null;
          }}
        />
      </Switch>
    </MemoryRouter>
  );
  return {
    getCurrentPath: () => currentPath,
  };
};

describe('IntegrationCell', () => {
  it('renders plain text with no popover when name is empty', () => {
    render(<IntegrationCell name="" />);
    expect(screen.queryByTestId('integrationCellLink')).not.toBeInTheDocument();
  });

  it('navigates to decoders with the integration name pre-filled', () => {
    const { getCurrentPath } = renderWithRouter('aws');
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    fireEvent.click(screen.getByText('Go to integration decoders'));
    expect(getCurrentPath()).toBe(`${ROUTES.DECODERS}?query=aws`);
  });

  it('navigates to rules with the integration name pre-filled', () => {
    const { getCurrentPath } = renderWithRouter('aws');
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    fireEvent.click(screen.getByText('Go to integration rules'));
    expect(getCurrentPath()).toBe(`${ROUTES.RULES}?query=aws`);
  });

  it('navigates to KVDBs with the integration name pre-filled', () => {
    const { getCurrentPath } = renderWithRouter('aws');
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    fireEvent.click(screen.getByText('Go to integration KVDBs'));
    expect(getCurrentPath()).toBe(`${ROUTES.KVDBS}?query=aws`);
  });
});
