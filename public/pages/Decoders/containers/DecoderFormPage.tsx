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
  setBreadcrumbs,
  successNotificationToast,
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
  EuiCallOut,
} from "@elastic/eui";
import { PageHeader } from "../../../components/PageHeader/PageHeader";
import FormFieldHeader from "../../../components/FormFieldHeader";
import { getLogTypeLabel } from "../../LogTypes/utils/helpers";
import { DecoderDocument } from "../../../../types/Decoders";
import { DataStore } from "../../../store/DataStore";
import { RouteComponentProps } from "react-router-dom";

const editorTypes = [
  {
    id: "yaml",
    label: "YAML Editor",
  },
];

type DecoderFormPageProps = {
  notifications: NotificationsStart;
  history: RouteComponentProps["history"];
  action: "create" | "edit";
  id?: string;
  match: { params: { id: string } };
};

const actionLabels: Record<string, string> = {
  create: "Create",
  edit: "Edit",
};

export const DecoderFormPage: React.FC<DecoderFormPageProps> = (props) => {
  const { notifications, history, action } = props;
  const idDecoder = props.match.params.id;
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
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

  const getIntegrationOptions = async () => {
    const options = await DataStore.decoders.getDraftIntegrations();
    return options.map((option) => ({
      value: option._source.document.title,
      label: option._source.document.title,
      id: option._id,
    }));
  };

  useEffect(() => {
    if (action === "create") {
      setBreadcrumbs([
        BREADCRUMBS.NORMALIZATION,
        BREADCRUMBS.DECODERS,
        BREADCRUMBS.DECODERS_CREATE,
      ]);
    }

    const fetchIntegrationTypes = async () => {
      setLoadingIntegrations(true);
      try {
        const options = await getIntegrationOptions();
        setIntegrationTypeOptions(options);
      } catch (error) {
        errorNotificationToast(
          notifications,
          "retrieve",
          "integration types",
          "There was an error retrieving the integration types.",
        );
      } finally {
        setLoadingIntegrations(false);
      }
    };

    fetchIntegrationTypes();
  }, [action, notifications]);

  const onChange = useCallback((e) => {
    setIntegrationType(e[0]?.id || "");
  }, []);

  const createDecoder = useCallback(
    async (values: DecoderFormModel) => {
      if (!values || !integrationType) {
        errorNotificationToast(
          notifications,
          "retrieve",
          "decoder",
          "Decoder or integration type is missing",
        );
        return;
      }

      const result = await DataStore.decoders.createDecoder({
        document: values,
        integrationId: integrationType,
      });

      if (result) {
        successNotificationToast(
          notifications,
          "create",
          "decoder",
          result.message ||
            `The decoder ${values.name} has been created successfully.`,
        );

        history.push(`${ROUTES.DECODERS}`);
      }
    },
    [integrationType, notifications, history],
  );

  const updateDecoder = useCallback(
    async (values: DecoderFormModel) => {
      if (!values) {
        errorNotificationToast(
          notifications,
          "retrieve",
          "decoder",
          "No decoder to update",
        );
        return;
      }

      const result = await DataStore.decoders.updateDecoder(idDecoder, {
        document: values,
      });

      if (result) {
        successNotificationToast(
          notifications,
          "update",
          "decoder",
          result.message ||
            `The decoder ${values.name} has been updated successfully.`,
        );

        history.push(`${ROUTES.DECODERS}`);
      }
    },
    [notifications, history],
  );

  const handleOnClick = useCallback(
    async (values: DecoderFormModel) => {
      if (action === "create") {
        await createDecoder(values);
      } else if (action === "edit") {
        await updateDecoder(values);
      }
    },
    [action, createDecoder, updateDecoder],
  );

  const validateForm = useCallback((values: DecoderFormModel) => {
    const errors: FormikErrors<DecoderFormModel> = {};

    if (!values.name) {
      errors.name = "Decoder name is required";
    }

    const parts = values.name.split("/");

    if (parts.length !== 3) {
      errors.name =
        "Decoder name must have exactly 3 parts 'decoder/<name>/<version>'";
    }

    if (parts?.[0] !== "decoder") {
      errors.name =
        "Decoder name must start with 'decoder/' and follow the format 'decoder/<name>/<version>'";
    }

    if (parts?.[1]?.trim().length === 0) {
      errors.name =
        "Name cannot have empty parts and must follow the format 'decoder/<name>/<version>'";
    }

    if (parts?.[2]?.trim().length === 0) {
      errors.name =
        "Version cannot have empty parts and must follow the format 'decoder/<name>/<version>'";
    }

    return errors;
  }, []);

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
          validate={validateForm}
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

                {action === "create" && (
                  <>
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
                        isLoading={loadingIntegrations}
                        isDisabled={
                          loadingIntegrations ||
                          integrationTypeOptions.length === 0
                        }
                        selectedOptions={
                          integrationType
                            ? [
                                {
                                  value:
                                    integrationTypeOptions.find(
                                      (option) => option.id === integrationType,
                                    )?.value || "",
                                  label: getLogTypeLabel(
                                    integrationTypeOptions.find(
                                      (option) => option.id === integrationType,
                                    )?.value || "",
                                  ),
                                },
                              ]
                            : []
                        }
                      />
                    </EuiCompressedFormRow>

                    {!loadingIntegrations &&
                      integrationTypeOptions.length === 0 && (
                        <>
                          <EuiSpacer size="m" />
                          <EuiCallOut
                            title="No integrations available"
                            color="warning"
                            iconType="alert"
                          >
                            <p>
                              There are no integrations in draft status
                              available to add decoders. Please create or draft
                              an integration first before adding decoders.
                            </p>
                          </EuiCallOut>
                        </>
                      )}

                    <EuiSpacer size="xl" />
                  </>
                )}

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
                        !integrationType || Object.keys(props.errors).length > 0
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
        </Formik>
      )}
    </>
  );
};
