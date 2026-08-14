/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataStore } from './DataStore';
import notificationsStartMock from '../../test/mocks/services/notifications/NotificationsStart.mock';
import services from '../../test/mocks/services';
import { DetectorsStore } from './DetectorsStore';
import { expect } from '@jest/globals';
import detectorResponseMock from '../../test/mocks/Detectors/containers/Detectors/DetectorResponse.mock';
import browserHistoryMock from '../../test/mocks/services/browserHistory.mock';
import { CreateDetectorState } from '../pages/CreateDetector/containers/CreateDetector';
import DetectorMock from '../../test/mocks/Detectors/containers/Detectors/Detector.mock';

describe('Detectors store specs', () => {
  Object.assign(services, {
    detectorsService: {
      getRules: () => Promise.resolve(detectorResponseMock),
      deleteRule: () => Promise.resolve(true),
      countDetectorsByIntegration: () => Promise.resolve({ ok: true, response: { count: 0 } }),
    },
  });

  DataStore.init(services, notificationsStartMock);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('detectors store should be created', () => {
    expect(DataStore.detectors instanceof DetectorsStore).toBe(true);
  });

  it('should handle the state', () => {
    DataStore.detectors.setState(
      {
        pendingRequests: [Promise.resolve()],
        detectorInput: {
          detector: { detector_type: 'test_detector_type' } as typeof DetectorMock,
        } as CreateDetectorState,
      },
      browserHistoryMock
    );

    let state = DataStore.detectors.getState();
    expect(state?.detectorInput?.detector.detector_type).toBe('test_detector_type');

    DataStore.detectors.deleteState();
    state = DataStore.detectors.getState();
    expect(state).toBe(undefined);
  });

  it('should get successful pending state', async () => {
    DataStore.detectors.setState(
      {
        pendingRequests: [
          Promise.resolve({
            ok: true,
          }),
          Promise.resolve({
            ok: true,
            response: {
              _id: '',
              detector: {
                detector_type: '',
                inputs: [
                  {
                    detector_input: {
                      indices: [],
                    },
                  },
                ],
              },
            },
          }),
        ],
        detectorInput: {
          detector: { detector_type: 'test_detector_type' } as typeof DetectorMock,
        } as CreateDetectorState,
      },
      browserHistoryMock
    );
    const pending = await DataStore.detectors.resolvePendingCreationRequest();
    expect(pending.ok).toBe(true);
  });

  it('should get failed pending state', async () => {
    DataStore.detectors.setState(
      {
        pendingRequests: [
          Promise.resolve({
            ok: false,
          }),
        ],
        detectorInput: {
          detector: { detector_type: 'test_detector_type' } as typeof DetectorMock,
        } as CreateDetectorState,
      },
      browserHistoryMock
    );
    const pending = await DataStore.detectors.resolvePendingCreationRequest();
    expect(pending.ok).toBe(false);
  });

  describe('countByIntegration', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('resolves the count on ok:true', async () => {
      jest
        .spyOn(DataStore.detectors.service, 'countDetectorsByIntegration')
        .mockResolvedValue({ ok: true, response: { count: 5 } } as any);

      const count = await DataStore.detectors.countByIntegration('aws', 'standard');
      expect(count).toBe(5);
    });

    it('resolves 0 on ok:false', async () => {
      jest
        .spyOn(DataStore.detectors.service, 'countDetectorsByIntegration')
        .mockResolvedValue({ ok: false, error: 'boom' } as any);

      const count = await DataStore.detectors.countByIntegration('aws', 'standard');
      expect(count).toBe(0);
    });

    it('resolves 0 when the service throws', async () => {
      jest
        .spyOn(DataStore.detectors.service, 'countDetectorsByIntegration')
        .mockRejectedValue(new Error('network error'));

      const count = await DataStore.detectors.countByIntegration('aws', 'standard');
      expect(count).toBe(0);
    });
  });
});
