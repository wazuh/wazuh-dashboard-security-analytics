import React, { useState, useEffect, useCallback } from "react";
import { NotificationsStart } from "opensearch-dashboards/public";
import { Form, Formik, FormikErrors } from "formik";
import {
  decoderFormDefaultValue,
  DecoderFormModel,
  mapDecoderToForm,
  mapYamlObjectToDecoder,
} from "../components/mappers";
import { YamlForm } from "../components/YamlForm";
import {
  errorNotificationToast,
  getLogTypeOptions,
  setBreadcrumbs,
} from "../../../utils/helpers";
import { BREADCRUMBS, ROUTES } from "../../../utils/constants";
import {
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiButtonGroup,
  EuiCompressedFormRow,
  EuiCompressedComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSmallButton,
  EuiToolTip,
  EuiLoadingSpinner,
} from "@elastic/eui";
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
  id?: string;
  match: { params: { id: string } };
};

const actionLabels: Record<string, string> = {
  create: "Create",
  edit: "Edit",
};

export const CreateDecoders: React.FC<FormDecodersProps> = (props) => {
  const { notifications, action } = props;
  const idDecoder = props.match.params.id;
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEditorType, setSelectedEditorType] = useState("yaml");
  const [integrationType, setIntegrationType] = useState<string>("");
  const [integrationTypeOptions, setIntegrationTypeOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [decoder, setDecoder] = useState<DecoderDocument | undefined>(
    undefined,
  );
  const [initialValue, setInitialValue] = useState<DecoderFormModel>(
    decoderFormDefaultValue,
  );

  useEffect(() => {
    const fetchDecoder = async () => {
      if (idDecoder) {
        setIsLoading(true);
        try {
          const response = await DataStore.decoders.getDecoder(idDecoder);
          setDecoder(response?.document);
          setIntegrationType(response?.integrations?.[0] || "");
          if (response?.document) {
            setInitialValue(mapDecoderToForm(response.document));
          }
          setBreadcrumbs([
            BREADCRUMBS.NORMALIZATION,
            BREADCRUMBS.DECODERS,
            BREADCRUMBS.DECODERS_EDIT,
            { text: response?.document.name },
          ]);
        } catch (error) {
          errorNotificationToast(
            notifications,
            "retrieve",
            "decoder",
            `There was an error retrieving the decoder with id ${idDecoder}.`,
          );
        } finally {
          setIsLoading(false);
        }
      }
    };
    if (action === "edit") {
      fetchDecoder();
    }
  }, [action, idDecoder, notifications]);

  useEffect(() => {
    if (action === "create") {
      setBreadcrumbs([
        BREADCRUMBS.NORMALIZATION,
        BREADCRUMBS.DECODERS,
        BREADCRUMBS.DECODERS_CREATE,
      ]);
    }

    const fetchIntegrationTypes = async () => {
      try {
        const options = await getLogTypeOptions();
        setIntegrationTypeOptions(options);
      } catch (error) {
        errorNotificationToast(
          notifications,
          "retrieve",
          "integration types",
          "There was an error retrieving the integration types.",
        );
      }
    };

    fetchIntegrationTypes();
  }, [action, notifications]);

  const onChange = useCallback((e) => {
    setIntegrationType(e[0]?.value || "");
  }, []);

  const createDecoder = useCallback((values: DecoderFormModel) => {
    if (!values || !integrationType) {
      errorNotificationToast(
        notifications,
        "retrieve",
        "decoder",
        "Decoder or integration type is missing",
      );
      return;
    }

    DataStore.decoders.createDecoder({
      document: values,
      integrationId: integrationType,
    });
  }, [integrationType, notifications]);

  const updateDecoder = useCallback((values: DecoderFormModel) => {
    if (!values) {
      errorNotificationToast(
        notifications,
        "retrieve",
        "decoder",
        "No decoder to update",
      );
      return;
    }

    DataStore.decoders.updateDecoder(values!.id, {
      document: values,
    });
  }, [notifications]);

  const handleOnClick = useCallback((values: DecoderFormModel) => {
    if (action === "create") {
      createDecoder(values);
    } else if (action === "edit") {
      updateDecoder(values);
    }
  }, [action, createDecoder, updateDecoder]);

  return (
    <>
      {isLoading ? (
        <EuiPanel>
          <EuiFlexGroup
            justifyContent="center"
            alignItems="center"
            style={{ minHeight: "400px" }}
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      ) : (
        <Formik
          key={decoder?.id || "new-decoder"}
          initialValues={initialValue}
          validateOnMount={true}
          enableReinitialize={true}
          validate={(values) => {
            const errors: FormikErrors<DecoderFormModel> = {};

            if (!values.name) {
              errors.name = "Rule name is required";
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
                    <h1>{actionLabels[action]}</h1>
                  </EuiText>

                  <EuiText size="s" color="subdued">
                    {action === "create"
                      ? "Create a new decoder to normalize logs from your selected integration."
                      : "Edit the decoder to update the normalization of logs from your selected integration."}
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
                      <FormFieldHeader headerTitle={"Integration"} />
                      <EuiSpacer size={"s"} />
                    </div>
                  }
                  fullWidth={true}
                >
                  <EuiCompressedComboBox
                    placeholder="Select integration"
                    data-test-subj={"integration_dropdown"}
                    options={integrationTypeOptions}
                    singleSelection={{ asPlainText: true }}
                    onChange={(e) => onChange(e)}
                    selectedOptions={
                      integrationType
                        ? [
                          {
                            value: integrationType,
                            label: getLogTypeLabel(integrationType),
                          },
                        ]
                        : []
                    }
                  />
                </EuiCompressedFormRow>

                <EuiSpacer size="xl" />

                {selectedEditorType === "yaml" && (
                  <YamlForm
                    decoder={decoder ? decoder : props.values}
                    isInvalid={Object.keys(props.errors).length > 0}
                    errors={Object.keys(props.errors).map(
                      (key) =>
                        props.errors[key as keyof DecoderFormModel] as string,
                    )}
                    change={(e) => {
                      const formState = mapYamlObjectToDecoder(e);
                      props.setValues(formState);
                    }}
                  />
                )}
              </EuiPanel>

              <EuiSpacer size="xl" />

              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiSmallButton href={`#${ROUTES.DECODERS}`}>
                    Cancel
                  </EuiSmallButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={
                      <>
                        <p>
                          {!integrationType
                            ? "Select an integration to enable creating the decoder"
                            : ""}
                        </p>
                        <p>
                          {Object.keys(props.errors).length > 0
                            ? "Please fix the errors in the form to proceed"
                            : ""}
                        </p>
                      </>
                    }
                    position="top"
                  >
                    <EuiSmallButton
                      disabled={
                        !integrationType ||
                        Object.keys(props.errors).length > 0
                      }
                      onClick={() => props.handleSubmit()}
                      fill
                    >
                      {actionLabels[action]} decoder
                    </EuiSmallButton>
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Form>
          )}
        </Formik >
      )}
    </>
  );
};
