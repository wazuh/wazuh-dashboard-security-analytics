/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
import {
  ParseExpressionError,
  markParseExpressionPosition,
  summarizeParseExpressionError,
} from '../utils/parseExpressionError';

export interface ParseExpressionErrorToastProps {
  error: ParseExpressionError;
  /** The engine's full message, kept behind "Show details". */
  details: string;
}

/**
 * Toast body for a parser expression the engine rejected: where it is and what failed, the
 * failing position marked, and the engine's whole trace only on demand. Printed in full, that
 * trace repeats the expression for every alternative the parser tried and runs off the screen.
 */
export const ParseExpressionErrorToast: React.FC<ParseExpressionErrorToastProps> = ({
  error,
  details,
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <>
      <EuiText size="s">
        <p data-test-subj="parseExpressionErrorSummary">{summarizeParseExpressionError(error)}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock
        language="text"
        fontSize="s"
        paddingSize="s"
        whiteSpace="pre"
        data-test-subj="parseExpressionErrorPosition"
      >
        {markParseExpressionPosition(error)}
      </EuiCodeBlock>
      <EuiSpacer size="xs" />
      <EuiButtonEmpty
        size="xs"
        flush="left"
        iconType={isDetailsOpen ? 'arrowDown' : 'arrowRight'}
        onClick={() => setIsDetailsOpen((open) => !open)}
        aria-expanded={isDetailsOpen}
        data-test-subj="parseExpressionErrorDetailsToggle"
      >
        {isDetailsOpen ? 'Hide details' : 'Show details'}
      </EuiButtonEmpty>
      {isDetailsOpen && (
        <EuiCodeBlock
          language="text"
          fontSize="s"
          paddingSize="s"
          whiteSpace="pre"
          overflowHeight={240}
          isCopyable
          data-test-subj="parseExpressionErrorDetails"
        >
          {details}
        </EuiCodeBlock>
      )}
    </>
  );
};
