/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ChangeEvent, Component } from 'react';
import {
  EuiConfirmModal,
  EuiCompressedFieldText,
  EuiForm,
  EuiCompressedFormRow,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

interface DeleteModalProps {
  additionalWarning?: string;
  closeDeleteModal: (event?: any) => void;
  confirmation?: boolean;
  ids: string;
  onClickDelete: (event?: any) => void | Promise<void>;
  type: string;
  confirmButtonText?: string;
}

interface DeleteModalState {
  confirmDeleteText: string;
  isLoading: boolean;
}

export const DEFAULT_DELETION_TEXT = 'delete';

export default class DeleteModal extends Component<DeleteModalProps, DeleteModalState> {
  private isComponentMounted = true;

  constructor(props: DeleteModalProps) {
    super(props);
    const { confirmation } = props;
    this.state = {
      confirmDeleteText: confirmation ? '' : DEFAULT_DELETION_TEXT,
      isLoading: false,
    };
  }

  componentWillUnmount() {
    this.isComponentMounted = false;
  }

  onChange = (e: ChangeEvent<HTMLInputElement>): void => {
    this.setState({ confirmDeleteText: e.target.value });
  };

  onConfirm = async () => {
    this.setState({ isLoading: true });
    try {
      await this.props.onClickDelete();
      if (this.isComponentMounted) {
        this.props.closeDeleteModal();
      }
    } finally {
      if (this.isComponentMounted) {
        this.setState({ isLoading: false });
      }
    }
  };

  render() {
    const {
      type,
      ids,
      closeDeleteModal,
      additionalWarning,
      confirmation,
      confirmButtonText,
    } = this.props;
    const { confirmDeleteText } = this.state;

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            <EuiText size="s">
              <h2>Delete {ids}</h2>
            </EuiText>
          }
          onCancel={closeDeleteModal}
          onConfirm={this.onConfirm}
          cancelButtonText={'Cancel'}
          confirmButtonText={confirmButtonText ?? `Delete ${type}`}
          buttonColor={'danger'}
          defaultFocusedButton="confirm"
          confirmButtonDisabled={confirmDeleteText != DEFAULT_DELETION_TEXT}
          isLoading={this.state.isLoading}
        >
          <EuiForm>
            <p>
              Delete "<strong>{ids}</strong>" permanently? {additionalWarning}
            </p>
            <EuiSpacer size="s" />
            {!!confirmation && (
              <EuiCompressedFormRow
                helpText={`To confirm deletion, type '${DEFAULT_DELETION_TEXT}'.`}
              >
                <EuiCompressedFieldText
                  value={confirmDeleteText}
                  placeholder={DEFAULT_DELETION_TEXT}
                  onChange={this.onChange}
                  data-test-subj={'deleteTextField'}
                />
              </EuiCompressedFormRow>
            )}
          </EuiForm>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}
