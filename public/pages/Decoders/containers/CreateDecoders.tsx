import React, { useState, useEffect } from "react";
import { NotificationsStart } from "opensearch-dashboards/public";
import { Form, Formik, FormikErrors } from "formik";
import { decoderFormDefaultValue, DecoderFormModel, mapDecoderToForm, mapFormToDecoder } from "../components/mappers";
import { YamlForm } from "../components/YamlForm";
import { errorNotificationToast, getLogTypeOptions, setBreadcrumbs } from "../../../utils/helpers";
import { BREADCRUMBS, ROUTES } from "../../../utils/constants";
import { EuiPanel, EuiText, EuiSpacer, EuiButtonGroup, EuiCompressedFormRow, EuiCompressedComboBox, EuiFlexGroup, EuiFlexItem, EuiSmallButton, EuiToolTip } from "@elastic/eui";
import { PageHeader } from "../../../components/PageHeader/PageHeader";
import FormFieldHeader from "../../../components/FormFieldHeader";
import { getLogTypeLabel } from "../../LogTypes/utils/helpers";
import { DecoderDocument } from "../../../../types/Decoders";
import { DataStore } from "../../../store/DataStore";

const editorTypes = [
  {
    id: "yaml",
    label: "YAML Editor",
  },
];

type FormDecodersProps = {
  notifications: NotificationsStart;
  action: "create" | "edit";
};

export const CreateDecoders: React.FC<FormDecodersProps> = ({ action, notifications }) => {
  const [selectedEditorType, setSelectedEditorType] = useState("yaml");
  const [integrationType, setIntegrationType] = useState<string>("");
  const [integrationTypeOptions, setIntegrationTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [decoder, setDecoder] = useState<DecoderDocument | undefined>(undefined);

  useEffect(() => {
    setBreadcrumbs([
      BREADCRUMBS.NORMALIZATION,
      BREADCRUMBS.DECODERS,
      BREADCRUMBS.DECODERS_CREATE,
    ]);

    const fetchIntegrationTypes = async () => {

      const options = await getLogTypeOptions()

      setIntegrationTypeOptions(options);
    };

    fetchIntegrationTypes();

  }, []);

  const initialValue = decoder ? mapFormToDecoder(decoder) : decoderFormDefaultValue;

  const onChange = (e) => {
    setIntegrationType(e[0]?.value || "");
  }

  const handleOnClick = (values: DecoderFormModel) => {
    if (action === 'create') {
      createDecoder(values);
    } else if (action === 'edit') {
      updateDecoder(values);
    }
  }

  const createDecoder = (values: DecoderFormModel) => {

    if (!values || !integrationType) {
      errorNotificationToast(notifications, 'retrieve', 'decoder', 'Decoder or integration type is missing');
      return;
    }

    DataStore.decoders.createDecoder({
      document: values,
      integrationId: integrationType,
    });
  }

  const updateDecoder = (values: DecoderFormModel) => {

    if (!values) {
      errorNotificationToast(notifications, 'retrieve', 'decoder', 'No decoder to update');
      return;
    }

    DataStore.decoders.updateDecoder(values!.id, {
      document: values,
    });
  }



  return (
    <Formik
      initialValues={initialValue}
      validateOnMount={true}
      validate={(values) => {
        const errors: FormikErrors<DecoderFormModel> = {};

        if (!values.name) {
          errors.name = 'Rule name is required';
        }

        return errors;
      }}
      onSubmit={(values, { setSubmitting }) => {
        setSubmitting(false);
        handleOnClick(values);
      }}
    >
      {(props) => (
        <Form>
          <EuiPanel className={"rule-editor-form"}>
            <PageHeader appDescriptionControls={false}>
              <EuiText size="s">
                <h1>Create</h1>
              </EuiText>

              <EuiText size="s" color="subdued">
                Create a decoder to normalize logs from the selected integration.
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

            <EuiCompressedFormRow
              label={
                <div>
                  <FormFieldHeader headerTitle={'Integration'} />
                  <EuiSpacer size={'s'} />
                </div>
              }
              fullWidth={true}
            >
              <EuiCompressedComboBox
                placeholder="Select integration"
                data-test-subj={'integration_dropdown'}
                options={integrationTypeOptions}
                singleSelection={{ asPlainText: true }}
                onChange={(e) => onChange(e)}
                selectedOptions={
                  integrationType ? [{ value: integrationType, label: getLogTypeLabel(integrationType) }] : []
                }
              />
            </EuiCompressedFormRow>

            <EuiSpacer size="xl" />

            {selectedEditorType === "yaml" && (
              <YamlForm
                decoder={decoder}
                isInvalid={Object.keys(props.errors).length > 0}
                errors={Object.keys(props.errors).map(
                  (key) => props.errors[key as keyof DecoderFormModel] as string
                )}
                change={(e) => {
                  const formState = mapDecoderToForm(e);
                  props.setValues(formState);
                }}
              />
            )}

          </EuiPanel>
          {action === 'create' || action === 'edit' ? (
            <>
              <EuiSpacer size="xl" />
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiSmallButton href={`#${ROUTES.DECODERS}`}>Cancel</EuiSmallButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={
                      <>
                        <p>
                          {!integrationType ? 'Select an integration to enable creating the decoder' : ''}
                        </p>
                        <p>
                          {Object.keys(props.errors).length > 0 ? 'Please fix the errors in the form to proceed' : ''}
                        </p>
                      </>
                    }
                    position="top"

                  >
                    <EuiSmallButton
                      disabled={!integrationType || Object.keys(props.errors).length > 0}
                      onClick={() => props.handleSubmit()}
                      fill
                    >
                      {action === 'create' ? 'Create' : 'Edit'} decoder
                    </EuiSmallButton>
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          ) : null}
        </Form>)}
    </Formik>
  );
};
