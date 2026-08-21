/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { getIntegrationsTableColumns, IntegrationTableItem } from './helpers';
import { ROUTES } from '../../../utils/constants';
import { setupCoreStart } from '../../../../test/utils/helpers';
import { getApplication } from '../../../services/utils/constants';

beforeAll(() => {
  setupCoreStart();
  (getApplication().getUrlForApp as jest.Mock).mockImplementation(
    (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path ?? ''}`
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

const buildItem = (overrides: Partial<IntegrationTableItem> = {}): IntegrationTableItem => ({
  // `id` is the OpenSearch `_id`, unique per space copy; `documentId` is shared across the
  // copies of a promoted integration. They differ in every space but draft.
  id: 'int-1',
  documentId: 'doc-1',
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
  const renderCountColumn = (field: 'rules' | 'decoders' | 'kvdbs', item: IntegrationTableItem) => {
    const columns = getIntegrationsTableColumns({
      showDetails: jest.fn(),
      setItemForAction: jest.fn(),
    });
    const column = columns.find((c) => c.field === field);
    return render(<>{column!.render!(item[field], item)}</>);
  };

  it("renders a non-zero count as a link whose href navigates pre-filtered by the row's own space", () => {
    const item = buildItem({ rules: 3, space: 'custom-space' });
    renderCountColumn('rules', item);

    const link = screen.getByText('3').closest('a');
    expect(link).toHaveAttribute(
      'href',
      `/app/rules#${ROUTES.RULES}?integration=aws&space=custom-space`
    );
  });

  it('renders a zero count as a disabled EuiLink (not an anchor), with no navigable href', () => {
    const item = buildItem({ decoders: 0 });
    renderCountColumn('decoders', item);

    const link = screen.getByText('0');
    expect(link.closest('a')).toBeNull();
    expect(link.closest('button')).toBeDisabled();
  });

  it("uses the row's own space, not a page-level space filter, when building the target href", () => {
    const item = buildItem({ kvdbs: 2, space: 'promoted-space' });
    renderCountColumn('kvdbs', item);

    const link = screen.getByText('2').closest('a');
    expect(link).toHaveAttribute(
      'href',
      `/app/kvdbs#${ROUTES.KVDBS}?integration=aws&space=promoted-space`
    );
  });

  it('wraps a non-zero count in a tooltip that names the entity, and the href stays unchanged', async () => {
    const item = buildItem({ rules: 3 });
    renderCountColumn('rules', item);

    const link = screen.getByText('3');
    fireEvent.mouseOver(link);
    expect(await screen.findByRole('tooltip', { hidden: true })).toHaveTextContent('rules');
    expect(link.closest('a')).toHaveAttribute(
      'href',
      `/app/rules#${ROUTES.RULES}?integration=aws&space=custom-space`
    );
  });

  it('wraps a zero count in a tooltip explaining there is nothing to open, and the link stays disabled', async () => {
    const item = buildItem({ decoders: 0 });
    renderCountColumn('decoders', item);

    const link = screen.getByText('0');
    fireEvent.mouseOver(link);
    expect(await screen.findByRole('tooltip', { hidden: true })).toHaveTextContent('decoders');
    expect(link.closest('a')).toBeNull();
  });

  it('gives Rules, Decoders and KVDBs their own distinct tooltip copy for the same count', async () => {
    const item = buildItem({ rules: 1, decoders: 1, kvdbs: 1 });

    const rulesRender = renderCountColumn('rules', item);
    fireEvent.mouseOver(screen.getByText('1'));
    const rulesTooltip = await screen.findByRole('tooltip', { hidden: true });
    expect(rulesTooltip).toHaveTextContent('rules');
    fireEvent.mouseOut(screen.getByText('1'));
    rulesRender.unmount();

    renderCountColumn('kvdbs', item);
    const kvdbLinks = screen.getAllByText('1');
    fireEvent.mouseOver(kvdbLinks[kvdbLinks.length - 1]);
    const kvdbsTooltip = await screen.findByRole('tooltip', { hidden: true });
    expect(kvdbsTooltip).toHaveTextContent('KVDBs');
  });
});

describe('getIntegrationsTableColumns — opening an integration', () => {
  const renderTitle = (item: IntegrationTableItem, showDetails: (id: string) => void) => {
    const columns = getIntegrationsTableColumns({ showDetails, setItemForAction: jest.fn() });
    const column = columns.find((c) => c.field === 'title');
    return render(<>{column!.render!(item.title, item)}</>);
  };

  it('opens it by the id shared across space copies, not by the per-copy _id', () => {
    // A promoted integration has a different `_id` in each space, and the detail view looks
    // it up by `document.id` plus the space, so linking by `_id` reported it as not found.
    const showDetails = jest.fn();
    renderTitle(buildItem({ id: 'os-id-in-custom', documentId: 'shared-doc-id' }), showDetails);

    fireEvent.click(screen.getByText('aws'));

    expect(showDetails).toHaveBeenCalledWith('shared-doc-id');
  });
});
