/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiConfirmModal, EuiText } from '@elastic/eui';
import React, { useEffect, useRef, useState } from 'react';

export interface DeleteRuleModalProps {
  title: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export const DeleteCorrelationRuleModal: React.FC<DeleteRuleModalProps> = ({
  title,
  onCancel,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <EuiConfirmModal
      title={
        <EuiText size="s">
          <h2>Delete {title}?</h2>
        </EuiText>
      }
      onCancel={() => {
        if (!isDeleting) {
          onCancel();
        }
      }}
      onConfirm={async () => {
        setIsDeleting(true);
        try {
          await onConfirm();
        } finally {
          if (isMountedRef.current) {
            setIsDeleting(false);
          }
        }
      }}
      isLoading={isDeleting}
      cancelButtonText="Cancel"
      confirmButtonText="Delete"
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      <EuiText size="s">
        Delete the correlation rule permanently? This action cannot be undone.
      </EuiText>
    </EuiConfirmModal>
  );
};
