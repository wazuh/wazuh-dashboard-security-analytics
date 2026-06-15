import React from 'react';
import { EuiCallOut } from '@elastic/eui';

export const RulesContentUpdateWarning: React.FC = () => {
  return (
    <EuiCallOut title="Warning" color="warning" iconType="alert">
      <p>
        Standard space rules may change when content is updated, which could affect your Detector configuration.
      </p>
    </EuiCallOut>
  );
};
