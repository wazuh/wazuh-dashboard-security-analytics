/*
 * PROTOTYPE — throwaway. See ./README.md
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { DecoderFormModel } from '../DecoderEditorFormModel';

/** Everything the decoder-specific block needs. Identical for every variant. */
export interface GrammarVariantProps {
  values: DecoderFormModel;
  onChange: (values: DecoderFormModel) => void;
  fieldErrors: Record<string, string>;
  /** Records that the user has left a field, so its error may be shown. */
  onBlurPath?: (path: string) => void;
}
