import React, { useState, useEffect } from "react";
import { setBreadcrumbs } from "../../../utils/helpers";
import { BREADCRUMBS } from "../../../utils/constants";
import { YamlForm } from "../components/YamlForm";

import { EuiPanel, EuiText, EuiSpacer, EuiButtonGroup } from "@elastic/eui";

import { Formik, Form, FormikErrors } from "formik";
import { PageHeader } from "../../../components/PageHeader/PageHeader";

const editorTypes = [
  {
    id: "yaml",
    label: "YAML Editor",
  },
];

export const CreateDecoders: React.FC = () => {
  const [selectedEditorType, setSelectedEditorType] = useState("yaml");
  useEffect(() => {
    setBreadcrumbs([
      BREADCRUMBS.NORMALIZATION,
      BREADCRUMBS.DECODERS,
      BREADCRUMBS.DECODERS_CREATE,
    ]);
  }, []);

  return (
    <EuiPanel className={"rule-editor-form"}>
      <PageHeader appDescriptionControls={false}>
        <EuiText size="s">
          <h1>Create</h1>
        </EuiText>

        <EuiText size="s" color="subdued">
          Create a decoder to normalize log
        </EuiText>

        <EuiSpacer />
      </PageHeader>

      <EuiButtonGroup
        data-test-subj="change-editor-type"
        legend="This is editor type selector"
        options={editorTypes}
        idSelected={selectedEditorType}
        onChange={(id) => setSelectedEditorType(id)}
      />

      <EuiSpacer size="xl" />

      {selectedEditorType === "yaml" && (
        <YamlForm
          onChange={(value: string) => {
            console.log("Changed YAML:", value);
          }}
          onFocus={() => {
            console.log("YAML editor focused");
          }}
        />
      )}
    </EuiPanel>
  );
};
