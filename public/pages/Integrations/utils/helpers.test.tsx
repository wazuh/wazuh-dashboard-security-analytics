/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { getIntegrationsTableColumns, IntegrationTableItem } from './helpers';
import { ROUTES } from '../../../utils/constants';

const buildItem = (overrides: Partial<IntegrationTableItem> = {}): IntegrationTableItem => ({
  id: 'int-1',
  title: 'aws',
  category: 'cloud',
  mode: '',
  space: 'custom-space',
  decoders: 0,
  kvdbs: 0,
  rules: 0,
  status: 'enabled',
  ...overrides,
});

describe('getIntegrationsTableColumns — entity count columns', () => {
  const renderCountColumn = (
    field: 'rules' | 'decoders' | 'kvdbs',
    item: IntegrationTableItem,
    history: { push: jest.Mock }
  ) => {
    const columns = getIntegrationsTableColumns({
      showDetails: jest.fn(),
      setItemForAction: jest.fn(),
      history,
    });
    const column = columns.find((c) => c.field === field);
    return render(<>{column!.render!(item[field], item)}</>);
  };

  it("renders a non-zero count as a clickable link that navigates pre-filtered by the row's own space", () => {
    const push = jest.fn();
    const item = buildItem({ rules: 3, space: 'custom-space' });
    renderCountColumn('rules', item, { push });

    const link = screen.getByText('3');
    fireEvent.click(link);
    expect(push).toHaveBeenCalledWith(`${ROUTES.RULES}?integration=aws&space=custom-space`);
  });

  it('renders a zero count as a disabled EuiLink (not plain text), and clicking it never navigates', () => {
    const push = jest.fn();
    const item = buildItem({ decoders: 0 });
    renderCountColumn('decoders', item, { push });

    const link = screen.getByText('0');
    fireEvent.click(link);
    expect(push).not.toHaveBeenCalled();
  });

  it("uses the row's own space, not a page-level space filter, when building the target URL", () => {
    const push = jest.fn();
    const item = buildItem({ kvdbs: 2, space: 'promoted-space' });
    renderCountColumn('kvdbs', item, { push });

    fireEvent.click(screen.getByText('2'));
    expect(push).toHaveBeenCalledWith(`${ROUTES.KVDBS}?integration=aws&space=promoted-space`);
  });

  it('wraps a non-zero count in a tooltip that names the entity, and clicking still navigates unchanged', async () => {
    const push = jest.fn();
    const item = buildItem({ rules: 3 });
    renderCountColumn('rules', item, { push });

    const link = screen.getByText('3');
    fireEvent.mouseOver(link);
    expect(await screen.findByRole('tooltip', { hidden: true })).toHaveTextContent('rules');
    fireEvent.click(link);
    expect(push).toHaveBeenCalledWith(`${ROUTES.RULES}?integration=aws&space=custom-space`);
  });

  it('wraps a zero count in a tooltip explaining there is nothing to open, and the link stays disabled', async () => {
    const push = jest.fn();
    const item = buildItem({ decoders: 0 });
    renderCountColumn('decoders', item, { push });

    const link = screen.getByText('0');
    fireEvent.mouseOver(link);
    expect(await screen.findByRole('tooltip', { hidden: true })).toHaveTextContent('decoders');
    fireEvent.click(link);
    expect(push).not.toHaveBeenCalled();
  });

  it('gives Rules, Decoders and KVDBs their own distinct tooltip copy for the same count', async () => {
    const push = jest.fn();
    const item = buildItem({ rules: 1, decoders: 1, kvdbs: 1 });

    const rulesRender = renderCountColumn('rules', item, { push });
    fireEvent.mouseOver(screen.getByText('1'));
    const rulesTooltip = await screen.findByRole('tooltip', { hidden: true });
    expect(rulesTooltip).toHaveTextContent('rules');
    fireEvent.mouseOut(screen.getByText('1'));
    rulesRender.unmount();

    renderCountColumn('kvdbs', item, { push });
    const kvdbLinks = screen.getAllByText('1');
    fireEvent.mouseOver(kvdbLinks[kvdbLinks.length - 1]);
    const kvdbsTooltip = await screen.findByRole('tooltip', { hidden: true });
    expect(kvdbsTooltip).toHaveTextContent('KVDBs');
  });
});
