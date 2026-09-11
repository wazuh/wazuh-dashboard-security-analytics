/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount } from 'enzyme';
import { DecoderEditorForm } from './DecoderEditorForm';
import { FIELD_LABELS } from './labels';
import { mapDecoderToForm } from './mappers';

/**
 * `FIELD_LABELS` exists so a validation message can name a field the way the form
 * does. That only holds while the two agree, so this renders the form and checks
 * every label in the map is one the form actually shows.
 */
describe('FIELD_LABELS', () => {
  const renderedLabels = () => {
    const wrapper = mount(
      <DecoderEditorForm
        values={mapDecoderToForm({
          id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
          name: 'decoder/zeek-stats/0',
          enabled: true,
          metadata: { title: 'T', author: 'A', description: 'D' },
        })}
        onChange={jest.fn()}
      />
    );
    return wrapper.find('strong').map((node) => node.text());
  };

  it('every mapped label is one the form renders', () => {
    const shown = renderedLabels();
    const missing = Object.entries(FIELD_LABELS)
      .filter(([, label]) => !shown.includes(label))
      .map(([path, label]) => `${path} → ${label}`);

    expect(missing).toEqual([]);
  });

  it('does not map anything inside normalize', () => {
    // Those errors keep their path, which is how the user finds them in the YAML.
    const inNormalize = Object.keys(FIELD_LABELS).filter((path) => path.startsWith('normalize'));
    expect(inNormalize).toEqual([]);
  });
});
