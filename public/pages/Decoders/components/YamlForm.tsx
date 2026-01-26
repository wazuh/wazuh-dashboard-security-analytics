import React from "react";
import { DecoderItem } from "../../../../types";
import {
  EuiCompressedFormRow,
  EuiCodeEditor,
  EuiLink,
  EuiSpacer,
  EuiText,
} from "@elastic/eui";
import FormFieldHeader from "../../../components/FormFieldHeader";

interface YamlFormProps {
  decoder?: DecoderItem;
  onChange: (value: string) => void;
  onFocus: () => void;
}

export const YamlForm: React.FC<YamlFormProps> = ({
  decoder,
  onChange,
  onFocus,
}) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCompressedFormRow
        label={<FormFieldHeader headerTitle={"Define decoder in YAML"} />}
        fullWidth={true}
      >
        <>
          <EuiSpacer />
          <EuiText size="s" color="subdued">
            Use the YAML editor to define a custom decoder.
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeEditor
            mode="yaml"
            width="100%"
            value={decoder ? JSON.stringify(decoder, null, 2) : ""}
            onChange={onChange}
            onFocus={onFocus}
            data-test-subj={"yaml_editor"}
          />
        </>
      </EuiCompressedFormRow>
    </>
  );
};
