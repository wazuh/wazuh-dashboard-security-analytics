/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { IntegrationCell } from './IntegrationCell';
import { ROUTES } from '../../utils/constants';

// Wazuh: a hand-rolled fake `history.push`, passed via IntegrationCell's optional
// `history` override, instead of relying on <MemoryRouter> + useHistory(). See
// useUrlFilterParams.ts for why: react-router's hooks resolve through
// React.useContext, which test/setup.jest.ts globally mocks for the unrelated
// SecurityAnalyticsContext pattern, breaking useHistory() (but not prop-drilling)
// in every test in this suite.
const renderWithFakeHistory = (name: string) => {
  const push = jest.fn();
  render(<IntegrationCell name={name} history={{ push }} />);
  return {
    getPushedPath: () => push.mock.calls[0]?.[0],
  };
};

describe('IntegrationCell', () => {
  it('renders plain text with no popover when name is empty', () => {
    render(<IntegrationCell name="" />);
    expect(screen.queryByTestId('integrationCellLink')).not.toBeInTheDocument();
  });

  it('navigates to decoders with the integration name pre-filled', () => {
    const { getPushedPath } = renderWithFakeHistory('aws');
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    fireEvent.click(screen.getByText('Go to integration decoders'));
    expect(getPushedPath()).toBe(`${ROUTES.DECODERS}?query=aws`);
  });

  it('navigates to rules with the integration name pre-filled', () => {
    const { getPushedPath } = renderWithFakeHistory('aws');
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    fireEvent.click(screen.getByText('Go to integration rules'));
    expect(getPushedPath()).toBe(`${ROUTES.RULES}?query=aws`);
  });

  it('navigates to KVDBs with the integration name pre-filled', () => {
    const { getPushedPath } = renderWithFakeHistory('aws');
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    fireEvent.click(screen.getByText('Go to integration KVDBs'));
    expect(getPushedPath()).toBe(`${ROUTES.KVDBS}?query=aws`);
  });
});
