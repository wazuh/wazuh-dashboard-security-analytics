/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { act } from '@testing-library/react';
import { DecoderEditorForm } from './DecoderEditorForm';
import { DecoderFormModel } from './DecoderEditorFormModel';
import { mapDecoderToForm, mapFormToDecoder } from './mappers';

const document = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  name: 'decoder/syslog/0',
  enabled: true,
  metadata: { title: 'Syslog', author: 'Wazuh', description: 'Parses syslog events' },
  check: '$event.module == syslog',
  normalize: [
    { check: '$event.action == login', map: [{ 'source.ip': '$_ip' }] },
    { map_if: { when: '$x' } },
  ],
};

const render = (values: DecoderFormModel, onChange = jest.fn(), extra = {}) =>
  mount(<DecoderEditorForm values={values} onChange={onChange} {...extra} />);

const subj = (wrapper: ReactWrapper, name: string) =>
  wrapper.find(`[data-test-subj="${name}"]`).hostNodes();

describe('DecoderEditorForm', () => {
  it('labels shared fields the way the KVDB and filter editors label them', () => {
    // Guards the decision in TERMINOLOGY.md: a field that also appears on a sibling
    // editor is never renamed here just because its document key differs.
    const text = render(mapDecoderToForm(document)).text();
    ['Title', 'Author', 'Description', 'Documentation', 'References'].forEach((label) =>
      expect(text).toContain(label)
    );
  });

  it('marks optional fields the way the filter form does', () => {
    const wrapper = render(mapDecoderToForm(document));
    expect(wrapper.find('em').map((node) => node.text())).toContain('optional');
    expect(wrapper.text()).toContain('Documentation - optional');
  });

  it('orders its fields on the KVDB spine, then the decoder fields by intent', () => {
    // Identity, the metadata block both siblings order identically, then the
    // decoder's own fields the way an event travels, definitions last.
    const all = render(mapDecoderToForm(document))
      .find('strong')
      .map((node) => node.text());

    const spine = [
      'ID',
      'Name',
      'Title',
      'Author',
      'Enabled',
      'Description',
      'Documentation',
      'References',
      'Supports',
      'Compatibility',
      'Parents',
      'Check',
      'Parsers',
      'Normalize',
      'Definitions',
    ];

    const positions = spine.map((label) => all.indexOf(label));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('gives no input its own fullWidth — the form row carries it, as in the siblings', () => {
    const wrapper = render(mapDecoderToForm(document));
    const widths = wrapper
      .find('EuiCompressedFieldText')
      .filterWhere((input) => {
        const name = input.prop('data-test-subj') as string | undefined;
        // Row editors are the documented exception: their inputs sit inside flex
        // items, exactly as KVDBContentEditor's do.
        return !!name && !name.includes('[');
      })
      .map((input) => input.prop('fullWidth'));

    expect(widths.every((value) => !value)).toBe(true);
  });

  it('shows id read-only on edit and not at all on create', () => {
    expect(subj(render(mapDecoderToForm(document)), 'id').prop('readOnly')).toBe(true);
    expect(subj(render(mapDecoderToForm({ ...document, id: undefined })), 'id')).toHaveLength(0);
  });

  it('names the keys it is preserving but cannot edit', () => {
    const wrapper = render(mapDecoderToForm({ ...document, map_if: 'x' }));
    expect(
      wrapper.find('[data-test-subj="preserved-keys-callout"]').first().prop('title')
    ).toContain('map_if');
  });

  it('does not show the preserved-keys notice when there is nothing to preserve', () => {
    expect(
      render(mapDecoderToForm(document)).find('[data-test-subj="preserved-keys-callout"]')
    ).toHaveLength(0);
  });

  it('surfaces errors that reached no field at all', () => {
    const wrapper = render(mapDecoderToForm(document), jest.fn(), {
      documentErrors: ["'map_if' is not a recognized field"],
    });
    expect(wrapper.text()).toContain("'map_if' is not a recognized field");
  });

  it('reports an edited field without disturbing the rest of the document', () => {
    const onChange = jest.fn();
    const wrapper = render(mapDecoderToForm(document), onChange);

    subj(wrapper, 'name').simulate('change', { target: { value: 'decoder/other/0' } });

    const next = onChange.mock.calls[0][0] as DecoderFormModel;
    expect(next.name).toBe('decoder/other/0');
    // The entry this editor cannot model survives an unrelated edit.
    expect(mapFormToDecoder(next).normalize).toEqual(document.normalize);
  });

  describe('error timing', () => {
    it('stays quiet on a form the user has not touched yet', () => {
      // Matches the filter and KVDB forms: validation has already run against the
      // loaded document, but nothing shows until a field is left or submit tried.
      const wrapper = render(mapDecoderToForm(document), jest.fn(), {
        fieldErrors: { 'metadata.title': "'metadata.title' is required" },
      });
      expect(wrapper.text()).not.toContain("'metadata.title' is required");
    });

    it('shows a field its error once that field is blurred', () => {
      const wrapper = render(mapDecoderToForm(document), jest.fn(), {
        fieldErrors: { 'metadata.title': "'metadata.title' is required" },
      });
      subj(wrapper, 'metadata.title').simulate('blur');
      expect(wrapper.text()).toContain("'metadata.title' is required");
    });

    it('shows every error once submission has been attempted', () => {
      const wrapper = render(mapDecoderToForm(document), jest.fn(), {
        fieldErrors: { 'metadata.title': "'metadata.title' is required" },
        submitAttempted: true,
      });
      expect(wrapper.text()).toContain("'metadata.title' is required");
    });
  });

  describe('info popovers', () => {
    // The filter form puts the blue info button beside its `Type` field for
    // reference material — what an option means — while keeping syntax guidance
    // inline. The same split applies here.
    //
    // EuiPopover renders its panel through a portal, which enzyme's `.text()` does
    // not traverse, so the content is asserted on the popover's own subtree.
    const popover = (wrapper: ReactWrapper, aria: string) =>
      wrapper
        .find('EuiPopover')
        .filterWhere((node) => {
          const button = node.prop('button') as React.ReactElement;
          return button?.props?.['aria-label'] === aria;
        })
        .first();

    const open = (wrapper: ReactWrapper, aria: string) => {
      wrapper.find(`button[aria-label="${aria}"]`).first().simulate('click');
      wrapper.update();
      return popover(wrapper, aria);
    };

    it('puts the check formats behind the info button, not on the page', () => {
      const wrapper = render(mapDecoderToForm(document));

      expect(popover(wrapper, 'Check format information').prop('isOpen')).toBe(false);
      // Closed, the page does not carry the both-shapes explanation.
      expect(wrapper.text()).not.toContain('Every event that reaches this point is accepted');

      const panel = open(wrapper, 'Check format information');
      expect(panel.prop('isOpen')).toBe(true);

      const terms = panel.find('InfoItem').map((item) => item.prop('term'));
      expect(terms).toEqual(['None', 'Expression', 'List']);
    });

    it('puts what a normalize entry can contain behind its info button', () => {
      const wrapper = render(mapDecoderToForm(document));
      expect(wrapper.text()).not.toContain('needs at least one parser or mapping');

      const panel = open(wrapper, 'Normalize information');
      expect(panel.prop('isOpen')).toBe(true);
      expect(panel.find('InfoItem').map((item) => item.prop('term'))).toEqual([
        'check',
        'parse|<field>',
        'map',
      ]);
    });

    it('still says inline what to type into the normalize editor', () => {
      // The popover is reference material; an empty editor must never be unexplained.
      expect(render(mapDecoderToForm(document)).text()).toContain('Written as YAML');
    });

    it('keeps syntax guidance inline, where it is needed while typing', () => {
      // The filter form keeps its own check-syntax hint, example block and all, on
      // the page rather than behind a click. Parsers follow that.
      expect(render(mapDecoderToForm(document)).text()).toContain('captures into that field');
    });

    it('does not stack two overlapping explanations on the check field', () => {
      const text = render(mapDecoderToForm(document)).text();
      const bothShapes = text.includes('or a list of field/value pairs');
      const modeSpecific = text.includes('Needs a field reference and an operator');
      expect(bothShapes && modeSpecific).toBe(false);
    });
  });

  describe('normalize', () => {
    const editor = (wrapper: ReactWrapper) =>
      wrapper.find('EuiCodeEditor[data-test-subj="normalize-yaml"]').first();

    it('shows the entries themselves, with no wrapper key to strip', () => {
      const yaml = editor(render(mapDecoderToForm(document))).prop('value') as string;
      expect(yaml.startsWith('- ')).toBe(true);
      expect(yaml).not.toContain('normalize:');
    });

    it('round-trips entries this editor cannot model', () => {
      const onChange = jest.fn();
      const wrapper = render(mapDecoderToForm(document), onChange);
      const yaml = editor(wrapper).prop('value') as string;

      expect(yaml).toContain('map_if');
      act(() => {
        ((editor(wrapper).prop('onChange') as unknown) as (value: string) => void)(yaml);
      });
      expect(mapFormToDecoder(onChange.mock.calls[0][0]).normalize).toEqual(document.normalize);
    });

    it('reports a syntax error and leaves the document alone', () => {
      const onChange = jest.fn();
      const wrapper = render(mapDecoderToForm(document), onChange);

      act(() => {
        ((editor(wrapper).prop('onChange') as unknown) as (value: string) => void)('- [unclosed');
      });
      wrapper.update();

      expect(subj(wrapper, 'normalize-yaml-error').length).toBeGreaterThan(0);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('rejects YAML that is not a list of entries', () => {
      const onChange = jest.fn();
      const wrapper = render(mapDecoderToForm(document), onChange);

      act(() => {
        ((editor(wrapper).prop('onChange') as unknown) as (value: string) => void)(
          'map: not-a-list'
        );
      });
      wrapper.update();

      expect(wrapper.text()).toContain('must be a list of entries');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('empties normalize when the block is cleared', () => {
      const onChange = jest.fn();
      const wrapper = render(mapDecoderToForm(document), onChange);

      act(() => {
        ((editor(wrapper).prop('onChange') as unknown) as (value: string) => void)('   ');
      });
      expect(onChange.mock.calls[0][0].normalize).toEqual([]);
    });

    it('shows a structural guide while empty, and drops it once there is content', () => {
      // The placeholder is the only place the shape is visible rather than
      // described, so it has to survive.
      const empty = render(mapDecoderToForm({ ...document, normalize: undefined }));
      const guide = editor(empty).prop('placeholder') as string;

      expect(guide).toContain('- check:');
      expect(guide).toContain('  parse|event.original:');
      expect(guide).toContain('  map:');
      // Ace only paints it while the editor is empty.
      expect(editor(empty).prop('value')).toBe('');
      expect(editor(render(mapDecoderToForm(document))).prop('value')).not.toBe('');
    });

    it('scopes the class its multi-line placeholder styling needs', () => {
      // react-ace builds the placeholder as a div and sets textContent, so without
      // `white-space: pre` from DecoderEditor.scss the guide collapses to one line.
      expect(editor(render(mapDecoderToForm(document))).prop('className')).toBe(
        'decoder-normalize-editor'
      );
    });

    it('counts the entries', () => {
      expect(render(mapDecoderToForm(document)).text()).toContain('2 entries');
      expect(
        render(mapDecoderToForm({ ...document, normalize: [{ map: [{ a: 1 }] }] })).text()
      ).toContain('1 entry');
    });
  });
});
