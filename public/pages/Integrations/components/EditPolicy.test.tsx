/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { EditPolicy } from './EditPolicy';
import { DataStore } from '../../../store/DataStore';
import { setupCoreStart } from '../../../../test/utils/helpers';
import { setCapabilities } from '../../../services/utils/constants';

beforeAll(() => {
  setupCoreStart();
  setCapabilities({} as any);
});

jest.mock('../../../store/DataStore', () => ({
  DataStore: {
    policies: {
      searchPolicies: jest.fn(),
      updatePolicy: jest.fn(),
      getPolicyResources: jest.fn(),
      clearSpaceNormalization: jest.fn(),
    },
    decoders: {
      getDecoder: jest.fn(),
      searchDecoders: jest.fn(),
    },
  },
}));

const policies = DataStore.policies as jest.Mocked<typeof DataStore.policies>;
const decoders = DataStore.decoders as jest.Mocked<typeof DataStore.decoders>;

const notifications: any = {
  toasts: {
    addDanger: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addInfo: jest.fn(),
  },
};

const policyDocument = {
  id: 'policy-1',
  root_decoder: 'dec-root',
  integrations: ['int-1', 'int-2'],
  filters: ['filter-1'],
  enrichments: [],
  enabled: true,
  index_unclassified_events: false,
  index_discarded_events: false,
  metadata: {
    title: 'Draft policy',
    author: 'Wazuh',
    description: '',
    documentation: '',
    references: [],
  },
};

const rootDecoder = {
  document: { id: 'dec-root', name: 'decoder/root/0', metadata: { title: 'Root' } },
};

const resourcesWith = (normalization: any) => ({
  ok: true as const,
  resources: {
    normalization: { decoders: [], kvdbs: [], filters: [], ...normalization },
    detection: { rules: ['rule-1'] },
  },
});

const mountEditPolicy = async (props: Partial<React.ComponentProps<typeof EditPolicy>> = {}) => {
  const callbacks = {
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };
  let wrapper: any;
  await act(async () => {
    wrapper = mount(
      <EditPolicy space="draft" notifications={notifications} {...callbacks} {...props} />
    );
  });
  wrapper.update();
  return { wrapper, ...callbacks };
};

const clearRootDecoder = async (wrapper: any) => {
  await act(async () => {
    wrapper.find('EuiComboBox').first().prop('onChange')([]);
  });
  wrapper.update();
};

const changeTitle = async (wrapper: any, title: string) => {
  await act(async () => {
    wrapper.find('EuiCompressedFieldText').first().prop('onChange')({ target: { value: title } });
  });
  wrapper.update();
};

const clickSave = async (wrapper: any) => {
  await act(async () => {
    wrapper.find('EuiFlyoutFooter').find('EuiButton').first().prop('onClick')();
  });
  wrapper.update();
};

const clickModalButton = async (wrapper: any, testSubj: string) => {
  await act(async () => {
    wrapper.find(`EuiButton[data-test-subj="${testSubj}"]`).prop('onClick')();
  });
  wrapper.update();
};

const findModal = (wrapper: any) => wrapper.find('RootDecoderRemovalModal');

describe('<EditPolicy /> root decoder removal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    policies.searchPolicies.mockResolvedValue({
      total: 1,
      items: [{ id: 'policy-1', document: policyDocument }],
    } as any);
    policies.updatePolicy.mockResolvedValue([true, {}] as any);
    decoders.getDecoder.mockResolvedValue(rootDecoder as any);
    decoders.searchDecoders.mockResolvedValue({ items: [rootDecoder], total: 1 } as any);
  });

  it('does not check the space resources when the root decoder is kept', async () => {
    const { wrapper } = await mountEditPolicy();
    await changeTitle(wrapper, 'Renamed');
    await clickSave(wrapper);

    expect(policies.getPolicyResources).not.toHaveBeenCalled();
    expect(policies.updatePolicy).toHaveBeenCalledWith(
      'draft',
      expect.objectContaining({ root_decoder: 'dec-root' })
    );
  });

  it('saves without a warning when the space has no normalization resources', async () => {
    policies.getPolicyResources.mockResolvedValue(resourcesWith({}));
    const { wrapper, onClose } = await mountEditPolicy();
    await clearRootDecoder(wrapper);
    await clickSave(wrapper);

    expect(policies.getPolicyResources).toHaveBeenCalledWith('draft');
    expect(findModal(wrapper).exists()).toBe(false);
    expect(policies.updatePolicy).toHaveBeenCalledWith(
      'draft',
      expect.objectContaining({ root_decoder: '' })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('warns and lists the resources by name, falling back to the id', async () => {
    policies.getPolicyResources.mockResolvedValue(
      resourcesWith({
        decoders: [{ id: 'dec-root', name: 'decoder/root/0' }],
        kvdbs: [{ id: 'kvdb-1', name: 'Ports' }, { id: 'kvdb-2' }],
      })
    );
    const { wrapper } = await mountEditPolicy();
    await clearRootDecoder(wrapper);
    await clickSave(wrapper);

    const modal = findModal(wrapper);
    expect(modal.exists()).toBe(true);
    expect(policies.updatePolicy).not.toHaveBeenCalled();
    expect(modal.find('[data-test-subj="rootDecoderRemovalModal-Decoders"]').first().text()).toBe(
      'Decoders (1)decoder/root/0'
    );
    expect(modal.find('[data-test-subj="rootDecoderRemovalModal-KVDBs"]').first().text()).toBe(
      'KVDBs (2)Portskvdb-2'
    );
    expect(modal.find('[data-test-subj="rootDecoderRemovalModal-Filters"]').exists()).toBe(false);
  });

  it('saves the policy without a root decoder on "Save anyway"', async () => {
    policies.getPolicyResources.mockResolvedValue(
      resourcesWith({ kvdbs: [{ id: 'kvdb-1', name: 'Ports' }] })
    );
    const { wrapper, onClose } = await mountEditPolicy();
    await clearRootDecoder(wrapper);
    await clickSave(wrapper);
    await clickModalButton(wrapper, 'rootDecoderRemovalModal-saveAnyway');

    expect(policies.clearSpaceNormalization).not.toHaveBeenCalled();
    expect(policies.updatePolicy).toHaveBeenCalledWith(
      'draft',
      expect.objectContaining({ root_decoder: '' })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the form open on "Cancel"', async () => {
    policies.getPolicyResources.mockResolvedValue(
      resourcesWith({ kvdbs: [{ id: 'kvdb-1', name: 'Ports' }] })
    );
    const { wrapper, onClose } = await mountEditPolicy();
    await clearRootDecoder(wrapper);
    await clickSave(wrapper);
    await act(async () => {
      findModal(wrapper).prop('onCancel')();
    });
    wrapper.update();

    expect(findModal(wrapper).exists()).toBe(false);
    expect(policies.updatePolicy).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('clears the normalization resources and saves the other edits on the cleared policy', async () => {
    policies.getPolicyResources.mockResolvedValue(
      resourcesWith({ filters: [{ id: 'filter-1', name: 'Drop noise' }] })
    );
    policies.clearSpaceNormalization.mockResolvedValue(true);
    const { wrapper, onClose, onSuccess } = await mountEditPolicy();
    await changeTitle(wrapper, 'Renamed');
    await clearRootDecoder(wrapper);
    await clickSave(wrapper);

    // The indexer unset the root decoder, deleted the filter and the integration left empty.
    policies.searchPolicies.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 'policy-1',
          document: { ...policyDocument, root_decoder: '', integrations: ['int-2'], filters: [] },
        },
      ],
    } as any);
    await clickModalButton(wrapper, 'rootDecoderRemovalModal-clearNormalization');

    expect(policies.clearSpaceNormalization).toHaveBeenCalledWith('draft');
    expect(policies.updatePolicy).toHaveBeenCalledTimes(1);
    expect(policies.updatePolicy).toHaveBeenCalledWith(
      'draft',
      expect.objectContaining({
        root_decoder: '',
        integrations: ['int-2'],
        filters: [],
        metadata: expect.objectContaining({ title: 'Renamed' }),
      })
    );
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('does not update the policy after clearing when nothing else was edited', async () => {
    policies.getPolicyResources.mockResolvedValue(
      resourcesWith({ kvdbs: [{ id: 'kvdb-1', name: 'Ports' }] })
    );
    policies.clearSpaceNormalization.mockResolvedValue(true);
    const { wrapper, onClose } = await mountEditPolicy();
    await clearRootDecoder(wrapper);
    await clickSave(wrapper);
    policies.searchPolicies.mockResolvedValue({
      total: 1,
      items: [{ id: 'policy-1', document: { ...policyDocument, root_decoder: '' } }],
    } as any);
    await clickModalButton(wrapper, 'rootDecoderRemovalModal-clearNormalization');

    expect(policies.clearSpaceNormalization).toHaveBeenCalledWith('draft');
    expect(policies.updatePolicy).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the warning open when clearing fails', async () => {
    policies.getPolicyResources.mockResolvedValue(
      resourcesWith({ kvdbs: [{ id: 'kvdb-1', name: 'Ports' }] })
    );
    policies.clearSpaceNormalization.mockResolvedValue(false);
    const { wrapper, onClose, onSuccess } = await mountEditPolicy();
    await clearRootDecoder(wrapper);
    await clickSave(wrapper);
    await clickModalButton(wrapper, 'rootDecoderRemovalModal-clearNormalization');

    expect(findModal(wrapper).exists()).toBe(true);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(policies.updatePolicy).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reports a failed resources check and still lets the user save', async () => {
    policies.getPolicyResources.mockResolvedValue({ ok: false, error: 'Forbidden' });
    const { wrapper } = await mountEditPolicy();
    await clearRootDecoder(wrapper);
    await clickSave(wrapper);

    const modal = findModal(wrapper);
    expect(modal.exists()).toBe(true);
    expect(modal.text()).toContain('Forbidden');
    expect(
      modal.find('EuiButton[data-test-subj="rootDecoderRemovalModal-clearNormalization"]').exists()
    ).toBe(false);

    await clickModalButton(wrapper, 'rootDecoderRemovalModal-saveAnyway');
    expect(policies.updatePolicy).toHaveBeenCalledWith(
      'draft',
      expect.objectContaining({ root_decoder: '' })
    );
  });
});
