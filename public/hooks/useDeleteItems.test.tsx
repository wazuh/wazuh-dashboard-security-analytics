/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useRef } from 'react';
import { expect } from '@jest/globals';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import notificationsStartMock from '../../test/mocks/services/notifications/NotificationsStart.mock';
import { DELETE_ACTION, useDeleteItems } from './useDeleteItems';

interface ProbeProps {
  deleteOne: (id: string) => Promise<unknown>;
  onDeleted?: (deletedIds: string[]) => void;
  callOrder: string[];
}

const Probe = React.forwardRef((props: ProbeProps, ref: React.Ref<any>) => {
  const isMountedRef = useRef(true);
  const reload = jest.fn(() => {
    props.callOrder.push('reload');
  });
  const trackedOnDeleted = props.onDeleted
    ? (ids: string[]) => {
        props.callOrder.push('onDeleted');
        props.onDeleted!(ids);
      }
    : undefined;

  const api = useDeleteItems({
    deleteOne: props.deleteOne,
    reload,
    notifications: notificationsStartMock,
    entityName: 'item',
    entityNamePlural: 'items',
    isMountedRef,
    onDeleted: trackedOnDeleted,
  });

  React.useImperativeHandle(ref, () => api);

  return null;
});

describe('useDeleteItems onDeleted', () => {
  it('fires onDeleted with the deleted id before reload on a successful single delete', async () => {
    const callOrder: string[] = [];
    const onDeleted = jest.fn();
    const deleteOne = jest.fn().mockResolvedValue('ok');
    const ref = React.createRef<any>();

    await act(async () => {
      mount(<Probe ref={ref} deleteOne={deleteOne} onDeleted={onDeleted} callOrder={callOrder} />);
    });

    await act(async () => {
      ref.current.setItemForAction({ action: DELETE_ACTION, id: 'item-1' });
    });

    await act(async () => {
      await ref.current.confirmDeleteSingle();
    });

    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledWith(['item-1']);
    expect(callOrder).toEqual(['onDeleted', 'reload']);
  });

  it('does not fire onDeleted when deleteOne resolves undefined (failed delete)', async () => {
    const callOrder: string[] = [];
    const onDeleted = jest.fn();
    const deleteOne = jest.fn().mockResolvedValue(undefined);
    const ref = React.createRef<any>();

    await act(async () => {
      mount(<Probe ref={ref} deleteOne={deleteOne} onDeleted={onDeleted} callOrder={callOrder} />);
    });

    await act(async () => {
      ref.current.setItemForAction({ action: DELETE_ACTION, id: 'item-1' });
    });

    await act(async () => {
      await ref.current.confirmDeleteSingle();
    });

    expect(onDeleted).not.toHaveBeenCalled();
    expect(callOrder).toEqual([]);
    expect(notificationsStartMock.toasts.addSuccess).not.toHaveBeenCalled();
  });

  it('passes only the succeeded ids to onDeleted for delete-selected with mixed results', async () => {
    const callOrder: string[] = [];
    const onDeleted = jest.fn();
    const deleteOne = jest.fn().mockImplementation((id: string) =>
      Promise.resolve(id === 'ok-1' || id === 'ok-2' ? 'ok' : undefined)
    );
    const ref = React.createRef<any>();

    await act(async () => {
      mount(<Probe ref={ref} deleteOne={deleteOne} onDeleted={onDeleted} callOrder={callOrder} />);
    });

    const onSuccess = jest.fn();
    await act(async () => {
      await ref.current.confirmDeleteSelected(
        [{ id: 'ok-1' }, { id: 'fail-1' }, { id: 'ok-2' }],
        onSuccess
      );
    });

    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledWith(['ok-1', 'ok-2']);
    expect(notificationsStartMock.toasts.addWarning).toHaveBeenCalledTimes(1);
  });

  it('does not throw when onDeleted is omitted (back-compat)', async () => {
    const deleteOne = jest.fn().mockResolvedValue('ok');
    const ref = React.createRef<any>();

    await act(async () => {
      mount(<Probe ref={ref} deleteOne={deleteOne} callOrder={[]} />);
    });

    await act(async () => {
      ref.current.setItemForAction({ action: DELETE_ACTION, id: 'item-1' });
    });

    await act(async () => {
      await ref.current.confirmDeleteSingle();
    });

    expect(notificationsStartMock.toasts.addSuccess).toHaveBeenCalled();
  });
});
