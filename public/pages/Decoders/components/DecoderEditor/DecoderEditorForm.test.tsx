/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { DecoderEditorForm } from './DecoderEditorForm';
import { DecoderFormModel } from './DecoderEditorFormModel';
import { mapDecoderToForm, mapFormToDecoder } from './mappers';

const document = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  name: 'decoder/syslog/0',
  enabled: true,
  metadata: { title: 'Syslog', author: 'Wazuh', description: 'Parses syslog events' },
  normalize: [
    { check: '$event.module == syslog', map: [{ 'source.ip': '$ip' }] },
    { map_if: { when: '$x' } },
  ],
};

const render = (values: DecoderFormModel, onChange = jest.fn(), extra = {}) =>
  mount(<DecoderEditorForm values={values} onChange={onChange} {...extra} />);

const subj = (wrapper: ReactWrapper, name: string) =>
  wrapper.find(`[data-test-subj="${name}"]`).hostNodes();

describe('DecoderEditorForm', () => {
  it('marks optional fields the way the filter form does', () => {
    const wrapper = render(mapDecoderToForm(document));
    // Filters render `Label - <em>optional</em>`; FormFieldHeader's own marker adds a
    // trailing space that leaves a visible gap. See ./labels.tsx.
    expect(wrapper.find('em').map((node) => node.text())).toContain('optional');
    expect(wrapper.text()).toContain('Documentation - optional');
    expect(wrapper.text()).not.toContain('optional  ');
  });

  it('renders one slot per normalize entry, in document order', () => {
    const wrapper = render(mapDecoderToForm(document));
    expect(subj(wrapper, 'normalize-entry-0').length).toBeGreaterThan(0);
    expect(subj(wrapper, 'normalize-entry-1').length).toBeGreaterThan(0);
    expect(subj(wrapper, 'normalize-entry-2')).toHaveLength(0);
  });

  it('keeps an unrenderable entry in place and disables its visual editor', () => {
    const wrapper = render(mapDecoderToForm(document));

    // Entry 1 is the one this editor cannot model; entry 0 is fine.
    expect(subj(wrapper, 'slot-unavailable-normalize[1]').length).toBeGreaterThan(0);
    expect(subj(wrapper, 'slot-unavailable-normalize[0]')).toHaveLength(0);

    const options = wrapper
      .find('EuiButtonGroup[data-test-subj="slot-editor-type-normalize[1]"]')
      .first()
      .prop('options') as Array<{ id: string; isDisabled?: boolean }>;
    expect(options.find((option) => option.id === 'structured')?.isDisabled).toBe(true);

    const renderable = wrapper
      .find('EuiButtonGroup[data-test-subj="slot-editor-type-normalize[0]"]')
      .first()
      .prop('options') as Array<{ id: string; isDisabled?: boolean }>;
    expect(renderable.find((option) => option.id === 'structured')?.isDisabled).toBe(false);
  });

  it('shows an unrenderable entry as YAML rather than an empty form', () => {
    const wrapper = render(mapDecoderToForm(document));
    expect(subj(wrapper, 'slot-yaml-normalize[1]').length).toBeGreaterThan(0);
  });

  it('names the keys it is preserving but cannot edit', () => {
    const wrapper = render(mapDecoderToForm({ ...document, map_if: 'x' }));
    const callout = wrapper.find('[data-test-subj="preserved-keys-callout"]').first();
    expect(callout.prop('title')).toContain('map_if');
  });

  it('does not show the preserved-keys notice when there is nothing to preserve', () => {
    const wrapper = render(mapDecoderToForm(document));
    expect(wrapper.find('[data-test-subj="preserved-keys-callout"]')).toHaveLength(0);
  });

  it('shows id read-only on edit and not at all on create', () => {
    const editing = render(mapDecoderToForm(document));
    expect(subj(editing, 'id').prop('readOnly')).toBe(true);

    const creating = render(mapDecoderToForm({ ...document, id: undefined }));
    expect(subj(creating, 'id')).toHaveLength(0);
  });

  it('routes a schema error reported against a document key onto its row', () => {
    const wrapper = render(mapDecoderToForm(document), jest.fn(), {
      fieldErrors: { 'normalize[0].map[0]': "'source.ip' must be a string" },
    });
    expect(wrapper.text()).toContain("'source.ip' must be a string");
  });

  it('surfaces errors that reached no field at all', () => {
    const wrapper = render(mapDecoderToForm(document), jest.fn(), {
      documentErrors: ["'map_if' is not a recognized field"],
    });
    expect(wrapper.text()).toContain("'map_if' is not a recognized field");
  });

  it('labels shared fields the way the KVDB and filter editors label them', () => {
    // Guards the decision recorded in TERMINOLOGY.md: a field that also appears on a
    // sibling editor is never renamed here just because its document key differs.
    const wrapper = render(mapDecoderToForm(document));
    const text = wrapper.text();

    ['Title', 'Author', 'Description', 'Documentation', 'References'].forEach((label) =>
      expect(text).toContain(label)
    );
  });

  it('orders its fields on the KVDB spine', () => {
    // Identity, the metadata block both siblings order identically, then the
    // decoder grammar in document order. See TERMINOLOGY.md and the component doc.
    const wrapper = render(mapDecoderToForm(document));
    const labels = wrapper
      .find('strong')
      .map((node) => node.text())
      .filter(
        (label) => !label.startsWith('Normalize ') && label !== 'Field' && label !== 'Expressions'
      );

    expect(labels).toEqual([
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
      'Definitions',
      'Check',
      'Type',
      'Parsers',
      'Normalize',
      'Type',
      'Expression',
    ]);
  });

  it('gives no input its own fullWidth — the form row carries it, as in the sibling forms', () => {
    const wrapper = render(mapDecoderToForm(document));
    const topLevelInputs = wrapper
      .find('EuiCompressedFieldText')
      .filterWhere((input) => {
        const subj = input.prop('data-test-subj') as string | undefined;
        // Row editors are the documented exception: their inputs sit inside flex
        // items, exactly as KVDBContentEditor's do.
        return !!subj && !subj.includes('map[') && !subj.includes('definitions[');
      })
      .map((input) => input.prop('fullWidth'));

    expect(topLevelInputs.every((value) => !value)).toBe(true);
  });

  it('offers no reorder control — no other form in the plugin has one', () => {
    const wrapper = render(mapDecoderToForm(document));
    expect(subj(wrapper, 'normalize[0].position')).toHaveLength(0);
    expect(subj(wrapper, 'normalize[0].moveUp')).toHaveLength(0);
    expect(subj(wrapper, 'normalize[0].moveDown')).toHaveLength(0);
    expect(subj(wrapper, 'normalize[0].delete').length).toBeGreaterThan(0);
  });

  it('numbers normalize entries from 1, like the rules detection editor', () => {
    const wrapper = render(mapDecoderToForm(document));
    expect(wrapper.text()).toContain('Normalize 1');
    expect(wrapper.text()).toContain('Normalize 2');
    expect(wrapper.text()).not.toContain('normalize[0]');
  });

  it('reports an edited field without disturbing the rest of the document', () => {
    const onChange = jest.fn();
    const values = mapDecoderToForm(document);
    const wrapper = render(values, onChange);

    subj(wrapper, 'name').simulate('change', { target: { value: 'decoder/other/0' } });

    const next = onChange.mock.calls[0][0] as DecoderFormModel;
    expect(next.name).toBe('decoder/other/0');
    // The unrenderable entry survives an unrelated edit.
    expect(mapFormToDecoder(next).normalize).toEqual(document.normalize);
  });
});
