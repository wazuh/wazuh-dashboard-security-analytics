/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from '@jest/globals';
import { reconcileDeletedItems } from './useDeleteReconciliation';

interface Item {
  id: string;
  name: string;
}

describe('reconcileDeletedItems', () => {
  it('passes items and total through unchanged when pending set is empty', () => {
    const items: Item[] = [
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
    ];

    const result = reconcileDeletedItems({
      items,
      total: 2,
      pendingIds: new Set(),
      getId: (item) => item.id,
    });

    expect(result.items).toEqual(items);
    expect(result.total).toBe(2);
    expect(result.pendingIds.size).toBe(0);
  });

  it('filters out an item whose id is pending and decrements total by 1', () => {
    const items: Item[] = [
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
    ];

    const result = reconcileDeletedItems({
      items,
      total: 2,
      pendingIds: new Set(['1']),
      getId: (item) => item.id,
    });

    expect(result.items).toEqual([{ id: '2', name: 'b' }]);
    expect(result.total).toBe(1);
    expect(Array.from(result.pendingIds)).toEqual(['1']);
  });

  it('filters only the pending id still present when two ids are pending but one is absent', () => {
    const items: Item[] = [
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
    ];

    const result = reconcileDeletedItems({
      items,
      total: 2,
      pendingIds: new Set(['1', '3']),
      getId: (item) => item.id,
    });

    expect(result.items).toEqual([{ id: '2', name: 'b' }]);
    expect(result.total).toBe(1);
    expect(Array.from(result.pendingIds)).toEqual(['1']);
  });

  it('releases a pending id from tracking once a fetch no longer returns it (self-heal)', () => {
    const items: Item[] = [{ id: '2', name: 'b' }];

    const result = reconcileDeletedItems({
      items,
      total: 1,
      pendingIds: new Set(['1']),
      getId: (item) => item.id,
    });

    expect(result.items).toEqual(items);
    expect(result.total).toBe(1);
    expect(result.pendingIds.size).toBe(0);
  });

  it('clamps total at 0 instead of going negative', () => {
    const items: Item[] = [{ id: '1', name: 'a' }];

    const result = reconcileDeletedItems({
      items,
      total: 0,
      pendingIds: new Set(['1']),
      getId: (item) => item.id,
    });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});
