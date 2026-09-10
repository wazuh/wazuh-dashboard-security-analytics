/*
 * PROTOTYPE — throwaway. See ./README.md
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from '@testing-library/react';
import { GRAMMAR_VARIANTS } from './index';
import { mapDecoderToForm, mapFormToDecoder } from '../mappers';
import { GrammarIssueVariant } from './GrammarIssueVariant';

/**
 * The one test the prototype keeps.
 *
 * Prototypes do not carry tests, but nothing else in the suite renders these
 * variants, and `tsc` in this checkout does not report undefined identifiers (the
 * parent's TypeScript cannot parse the local `@types/node`, and those syntax errors
 * suppress semantic diagnostics). A variant with a missing import therefore reaches
 * the browser as a blank tab with no warning from any check — which is exactly what
 * happened to the tabs variant.
 */

const decoder = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  name: 'decoder/syslog/0',
  enabled: true,
  metadata: { title: 'Syslog', author: 'Wazuh', description: 'Parses syslog events' },
  definitions: { _threshold: 5 },
  check: '$event.module == syslog',
  'parse|message': ['expr'],
  normalize: [
    { check: '$event.action == login', 'parse|message': ['expr'], map: [{ 'source.ip': '$_ip' }] },
    { map_if: { when: '$x' } },
    { map: [{ 'event.kind': 'event' }] },
  ],
};

describe.each(GRAMMAR_VARIANTS.map((v) => [v.key, v.Component]))(
  'grammar variant: %s',
  (_key, Component: any) => {
    it('renders every section of a populated decoder', () => {
      const wrapper = mount(
        <Component
          values={mapDecoderToForm(decoder)}
          onChange={jest.fn()}
          fieldErrors={{ 'normalize[0].map[0]': "'source.ip' must be a string" }}
        />
      );
      // A variant that hides sections behind tabs or a flyout still has to mount
      // them all without throwing, which is what catches a missing import.
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.text()).toContain('Normalize');
    });

    it('renders an empty decoder', () => {
      const wrapper = mount(
        <Component values={mapDecoderToForm({})} onChange={jest.fn()} fieldErrors={{}} />
      );
      expect(wrapper.exists()).toBe(true);
    });
  }
);

describe('tabs variant', () => {
  it('mounts every tab panel, not only the selected one', () => {
    // Regression: CheckEditor and MapRows were used without being imported, so the
    // Check and Definitions tabs threw the moment they were opened.
    const { Component } = GRAMMAR_VARIANTS.find((v) => v.key === 'tabs')!;
    const wrapper = mount(
      <Component values={mapDecoderToForm(decoder)} onChange={jest.fn()} fieldErrors={{}} />
    );

    const tabs = wrapper.find('EuiTabbedContent').first().prop('tabs') as any[];
    expect(tabs.map((tab) => tab.id)).toEqual(['check', 'parsers', 'normalize', 'definitions']);

    tabs.forEach((tab) => {
      expect(() => mount(<div>{tab.content}</div>)).not.toThrow();
    });
  });
});

describe('issue variant: normalize as a YAML block', () => {
  const withNormalize = {
    ...decoder,
    normalize: [
      { check: '$event.action == login', 'parse|message': ['e'], map: [{ 'source.ip': '$_ip' }] },
      { map_if: { when: '$x' } },
    ],
  };

  const mountIssue = () => {
    let latest = mapDecoderToForm(withNormalize);
    const wrapper = mount(
      <GrammarIssueVariant
        values={latest}
        onChange={(next) => {
          latest = next;
        }}
        fieldErrors={{}}
      />
    );
    return { wrapper, current: () => latest };
  };

  it('round-trips normalize through the block, unrenderable entries included', () => {
    const { wrapper, current } = mountIssue();
    const editor = wrapper.find('EuiCodeEditor[data-test-subj="normalize-yaml"]').first();
    const yaml = editor.prop('value') as string;

    // The block shows the entries themselves, with no wrapper key to strip.
    expect(yaml.startsWith('- ')).toBe(true);
    expect(yaml).toContain('map_if');

    act(() => {
      (editor.prop('onChange') as any)(yaml);
    });
    expect(mapFormToDecoder(current()).normalize).toEqual(withNormalize.normalize);
  });

  it('reports a syntax error and leaves the document alone', () => {
    const { wrapper, current } = mountIssue();
    act(() => {
      (wrapper
        .find('EuiCodeEditor[data-test-subj="normalize-yaml"]')
        .first()
        .prop('onChange') as any)('- [unclosed');
    });
    wrapper.update();

    expect(wrapper.find('[data-test-subj="normalize-yaml-error"]').length).toBeGreaterThan(0);
    expect(mapFormToDecoder(current()).normalize).toEqual(withNormalize.normalize);
  });
});
