/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  DetailsFlyoutHeader,
  DetailsOverview,
  LabeledBadge,
  ReferencesSection,
  formatDetailsDate,
} from './DetailsFlyout';

const LONG_URL = `https://example.com/${'very-long-path/'.repeat(20)}`;

describe('formatDetailsDate', () => {
  it('formats date-only values without a time', () => {
    expect(formatDetailsDate('2026-07-28')).toBe('Jul 28, 2026');
  });

  it('leaves empty values empty', () => {
    expect(formatDetailsDate(undefined)).toBeUndefined();
    expect(formatDetailsDate('')).toBe('');
  });
});

describe('<DetailsFlyoutHeader />', () => {
  it('uses the title as the heading with the eyebrow above it', () => {
    render(
      <DetailsFlyoutHeader
        eyebrow="Decoder details"
        title="Cisco Nexus"
        titleId="t"
        onClose={jest.fn()}
        closeButtonTestSubj="close"
      />
    );
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Cisco Nexus');
    expect(screen.getByText('Decoder details')).toBeTruthy();
  });

  it('falls back to the eyebrow as the heading when there is no title', () => {
    render(
      <DetailsFlyoutHeader
        eyebrow="KVDB details"
        titleId="t"
        onClose={jest.fn()}
        closeButtonTestSubj="close"
      />
    );
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('KVDB details');
    expect(screen.getAllByText('KVDB details')).toHaveLength(1);
  });
});

describe('<LabeledBadge />', () => {
  it('names its value and renders nothing without one', () => {
    const { container, rerender } = render(<LabeledBadge label="Space" value="draft" />);
    expect(container.textContent).toBe('Space: draft');
    rerender(<LabeledBadge label="Space" />);
    expect(container.textContent).toBe('');
  });
});

describe('<DetailsOverview />', () => {
  it('shows the description and leaves out empty fields', () => {
    render(
      <DetailsOverview
        description="Parses Cisco logs."
        testSubj="overview"
        items={[
          { title: 'Author', description: 'Wazuh' },
          { title: 'Documentation', description: '' },
          { title: 'Supports', description: null },
        ]}
      />
    );
    expect(screen.getByText('Parses Cisco logs.')).toBeTruthy();
    expect(screen.getByText('Author')).toBeTruthy();
    expect(screen.queryByText('Documentation')).toBeNull();
    expect(screen.queryByText('Supports')).toBeNull();
  });
});

describe('<ReferencesSection />', () => {
  it('renders nothing when there are no references', () => {
    const { container } = render(<ReferencesSection idPrefix="x" urls={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('counts references and truncates long URLs', () => {
    render(<ReferencesSection idPrefix="x" urls={[LONG_URL]} />);
    const section = screen.getByTestId('x_section_references');
    expect(section.querySelector('h3')?.textContent).toBe('References (1)');
    expect(section.querySelector('button')?.getAttribute('aria-expanded')).toBe('false');
    const link = screen.getByTestId('x_references').querySelector('a')!;
    expect(link.getAttribute('href')).toBe(LONG_URL);
    expect(link.querySelector('.eui-textTruncate')?.textContent).toBe(LONG_URL);
  });
});
