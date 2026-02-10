import React from 'react';
import {
  EuiButton,
  EuiConfirmModal,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiOverlayMask,
  EuiText,
} from '@elastic/eui';

export const ButtonOpenModalConfirm: React.FC<{
  label: string;
  buttonProps: any;
  modal: {
    title: string | React.ReactNode;
    cancelButtonText: string;
    confirmButtonText: string;
    onConfirm: () => void;
  };
}> = ({
  label,
  buttonProps,
  modal: {
    title,
    cancelButtonText = 'Cancel',
    confirmButtonText = 'Confirm',
    onConfirm,
    ...modalProps
  },
  children,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      {isOpen && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={
              typeof title === 'string' ? (
                <EuiText size="s">
                  <h2>{title}</h2>
                </EuiText>
              ) : (
                title
              )
            }
            onCancel={() => setIsOpen(false)}
            onConfirm={onConfirm}
            cancelButtonText={cancelButtonText}
            confirmButtonText={confirmButtonText}
            buttonColor="primary"
            defaultFocusedButton="confirm"
            {...modalProps}
          >
            {typeof children === 'function'
              ? children({ closeModal: () => setIsOpen(false) })
              : children}
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
      <EuiButton {...buttonProps} onClick={() => setIsOpen(true)}>
        {label}
      </EuiButton>
    </>
  );
};

export const ButtonOpenModal: React.FC<{
  label: string;
  buttonProps: any;
  modal: {
    title: string | React.ReactNode;
    cancelButtonText: string;
    confirmButtonText: string;
    onConfirm: () => void;
  };
}> = ({
  label,
  buttonProps,
  modal: {
    title,
    cancelButtonText = 'Cancel',
    confirmButtonText = 'Confirm',
    onConfirm,
    ...modalProps
  },
  children,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      {isOpen && (
        <EuiOverlayMask>
          <EuiModal onClose={() => setIsOpen(false)}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                {typeof title === 'string' ? (
                  <EuiText size="s">
                    <h2>{title}</h2>
                  </EuiText>
                ) : (
                  title
                )}
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              {typeof children === 'function'
                ? children({ closeModal: () => setIsOpen(false) })
                : children}
            </EuiModalBody>
          </EuiModal>
        </EuiOverlayMask>
      )}
      <EuiButton {...buttonProps} onClick={() => setIsOpen(true)}>
        {label}
      </EuiButton>
    </>
  );
};
