/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState, useEffect, useCallback } from "react";
import { NotificationsStart } from "opensearch-dashboards/public";
import { Form, Formik, FormikErrors } from "formik";
import {
  kvdbFormDefaultValue,
  KVDBFormModel,
  mapFormToKVDBResource,
  mapKVDBToForm,
} from "../components/mappers";
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
  EuiCompressedFormRow,
  EuiCompressedComboBox,
  EuiCompressedFieldText,
  EuiCompressedTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSmallButton,
  EuiToolTip,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiCompressedSwitch,
} from "@elastic/eui";
import { PageHeader } from "../../../components/PageHeader/PageHeader";
import FormFieldHeader from "../../../components/FormFieldHeader";
import { getLogTypeLabel } from "../../LogTypes/utils/helpers";
import { DataStore } from "../../../store/DataStore";
import { RouteComponentProps } from "react-router-dom";
import { ContentEntry, KVDBContentEditor } from "../components/KVDBContentEditor";

const KVDB_ACTION = {
  CREATE: "create",
  EDIT: "edit",
};

type KVDBFormPageProps = {
  notifications: NotificationsStart;
  history: RouteComponentProps["history"];
  action: keyof typeof KVDB_ACTION;
  match: { params: { id?: string } };
};

const actionLabels = {
  create: "Create",
  edit: "Edit",
};

export const KVDBFormPage: React.FC<KVDBFormPageProps> = (props) => {
  const { notifications, history, action } = props;
  const kvdbId = props.match.params.id;
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [integrationType, setIntegrationType] = useState<string>("");
  const [integrationTypeOptions, setIntegrationTypeOptions] = useState<
    { value: string; label: string; id: string }[]
  >([]);
  const [initialValue, setInitialValue] =
    useState<KVDBFormModel>(kvdbFormDefaultValue);

  useEffect(() => {
    const fetchKVDB = async () => {
      if (kvdbId) {
        setIsLoading(true);
        try {
          const item = await DataStore.kvdbs.getKVDB(kvdbId);
          if (item?.document) {
            setInitialValue(mapKVDBToForm(item.document));
          }
          setBreadcrumbs([
            BREADCRUMBS.NORMALIZATION,
            BREADCRUMBS.KVDBS,
            BREADCRUMBS.KVDBS_EDIT,
            { text: item?.document?.title || kvdbId },
          ]);
        } catch (error) {
          errorNotificationToast(
            notifications,
            "retrieve",
            "KVDB",
            `There was an error retrieving the KVDB with id ${kvdbId}.`,
          );
        } finally {
          setIsLoading(false);
        }
      }
    };
    if (action === KVDB_ACTION.EDIT) {
      fetchKVDB();
    }
  }, [action, kvdbId, notifications]);

  const getIntegrationOptions = async () => {
    const options = await DataStore.decoders.getDraftIntegrations();
    return options.map((option: any) => ({
      value: option._source.document.title,
      label: option._source.document.title,
      id: option._id,
    }));
  };

  useEffect(() => {
    if (action === KVDB_ACTION.CREATE) {
      setBreadcrumbs([
        BREADCRUMBS.NORMALIZATION,
        BREADCRUMBS.KVDBS,
        BREADCRUMBS.KVDBS_CREATE,
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

  const onIntegrationChange = useCallback((e: any) => {
    setIntegrationType(e[0]?.id || "");
  }, []);

  const createKVDB = useCallback(
    async (values: KVDBFormModel) => {
      if (!integrationType) {
        errorNotificationToast(
          notifications,
          KVDB_ACTION.CREATE,
          "KVDB",
          "Integration type is required",
        );
        return;
      }

      const resource = mapFormToKVDBResource(values);
      const result = await DataStore.kvdbs.createKVDB({
        resource,
        integrationId: integrationType,
      });

      if (result) {
        successNotificationToast(
          notifications,
          KVDB_ACTION.CREATE,
          "KVDB",
          result.message ||
            `The KVDB "${values.title}" has been created successfully.`,
        );
        history.push(ROUTES.KVDBS);
      }
    },
    [integrationType, notifications, history],
  );

  const updateKVDB = useCallback(
    async (values: KVDBFormModel) => {
      if (!kvdbId) return;

      const resource = mapFormToKVDBResource(values);
      const result = await DataStore.kvdbs.updateKVDB(kvdbId, { resource });

      if (result) {
        successNotificationToast(
          notifications,
          "update",
          "KVDB",
          result.message ||
            `The KVDB "${values.title}" has been updated successfully.`,
        );
        history.push(ROUTES.KVDBS);
      }
    },
    [kvdbId, notifications, history],
  );

  const handleSubmit = useCallback(
    async (values: KVDBFormModel) => {
      if (action === KVDB_ACTION.CREATE) {
        await createKVDB(values);
      } else if (action === KVDB_ACTION.EDIT) {
        await updateKVDB(values);
      }
    },
    [action, createKVDB, updateKVDB],
  );

  const validateForm = useCallback((values: KVDBFormModel) => {
    const errors: FormikErrors<KVDBFormModel> = {};

    if (!values.title.trim()) {
      errors.title = "Title is required";
    }

    if (!values.author.trim()) {
      errors.author = "Author is required";
    }

    // get content key counts to flag all entries sharing a duplicate key
    const keyCounts: Record<string, number> = {};
    values.contentEntries.forEach(({ key }) => {
      const k = key.trim();
      if (k) keyCounts[k] = (keyCounts[k] ?? 0) + 1;
    });

    const contentErrors = values.contentEntries.map((entry): FormikErrors<ContentEntry> => {
      const entryErrors: FormikErrors<ContentEntry> = {};

      if (entry.key.trim() && keyCounts[entry.key.trim()] > 1) {
        entryErrors.key = "Duplicate key";
      }

      const trimmed = entry.value.trim();
      if (trimmed[0] === "{" || trimmed[0] === "[") {
        try {
          JSON.parse(trimmed);
        } catch {
          entryErrors.value = "Invalid JSON";
        }
      }

      return entryErrors;
    });

    if (contentErrors.some((e) => Object.keys(e).length > 0)) {
      errors.contentEntries = contentErrors as any;
    }

    return errors;
  }, []);

  const isSubmitDisabled = (errors: FormikErrors<KVDBFormModel>) => {
    if (errors.title || errors.author) return true;
    if (action === KVDB_ACTION.CREATE && !integrationType) return true;
    return false;
  };

  const getSubmitTooltip = (errors: FormikErrors<KVDBFormModel>) => {
    const messages: string[] = [];
    if (action === KVDB_ACTION.CREATE && !integrationType) {
      messages.push("Select an integration to proceed");
    }
    if (errors.title || errors.author) {
      messages.push("Please fix the errors in the form to proceed");
    }
    return messages.length > 0 ? messages.join(". ") : undefined;
  };

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
          key={kvdbId || "new-kvdb"}
          initialValues={initialValue}
          validateOnMount={true}
          enableReinitialize={true}
          validate={validateForm}
          onSubmit={(values, { setSubmitting }) => {
            setSubmitting(false);
            handleSubmit(values);
          }}
        >
          {(formikProps) => (
            <Form>
              <EuiPanel>
                <PageHeader appDescriptionControls={false}>
                  <EuiText size="s">
                    <h1>{actionLabels[action]} KVDB</h1>
                  </EuiText>
                  <EuiText size="s" color="subdued">
                    {action === KVDB_ACTION.CREATE
                      ? "Create a new KVDB for your selected integration."
                      : "Edit the KVDB to update its configuration."}
                  </EuiText>
                  <EuiSpacer />
                </PageHeader>

                {action === KVDB_ACTION.CREATE && (
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
                        data-test-subj={"kvdb_integration_dropdown"}
                        options={integrationTypeOptions}
                        singleSelection={{ asPlainText: true }}
                        onChange={onIntegrationChange}
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
                              available to add KVDBs. Please create or draft an
                              integration first before adding KVDBs.
                            </p>
                          </EuiCallOut>
                        </>
                      )}

                    <EuiSpacer size="xl" />
                  </>
                )}

                <EuiCompressedFormRow
                  label={<FormFieldHeader headerTitle={"Title"} />}
                  fullWidth={true}
                  isInvalid={
                    !!formikProps.errors.title && formikProps.touched.title
                  }
                  error={formikProps.errors.title}
                >
                  <EuiCompressedFieldText
                    placeholder="Enter KVDB title"
                    value={formikProps.values.title}
                    onChange={(e) =>
                      formikProps.setFieldValue("title", e.target.value)
                    }
                    onBlur={() => formikProps.setFieldTouched("title")}
                    isInvalid={
                      !!formikProps.errors.title && formikProps.touched.title
                    }
                    data-test-subj="kvdb_title_field"
                  />
                </EuiCompressedFormRow>

                <EuiSpacer size="m" />

                <EuiCompressedFormRow
                  label={<FormFieldHeader headerTitle={"Author"} />}
                  fullWidth={true}
                  isInvalid={
                    !!formikProps.errors.author && formikProps.touched.author
                  }
                  error={formikProps.errors.author}
                >
                  <EuiCompressedFieldText
                    placeholder="Enter author name"
                    value={formikProps.values.author}
                    onChange={(e) =>
                      formikProps.setFieldValue("author", e.target.value)
                    }
                    onBlur={() => formikProps.setFieldTouched("author")}
                    isInvalid={
                      !!formikProps.errors.author && formikProps.touched.author
                    }
                    data-test-subj="kvdb_author_field"
                  />
                </EuiCompressedFormRow>

                <EuiSpacer size="m" />

                <EuiCompressedFormRow
                  label={<FormFieldHeader headerTitle={"Description"} />}
                  fullWidth={true}
                >
                  <EuiCompressedTextArea
                    placeholder="Enter a description"
                    value={formikProps.values.description}
                    onChange={(e) =>
                      formikProps.setFieldValue("description", e.target.value)
                    }
                    data-test-subj="kvdb_description_field"
                  />
                </EuiCompressedFormRow>

                <EuiSpacer size="m" />

                <EuiCompressedFormRow
                  label={<FormFieldHeader headerTitle={"Documentation"} />}
                  fullWidth={true}
                >
                  <EuiCompressedFieldText
                    placeholder="Enter documentation URL"
                    value={formikProps.values.documentation}
                    onChange={(e) =>
                      formikProps.setFieldValue("documentation", e.target.value)
                    }
                    data-test-subj="kvdb_documentation_field"
                  />
                </EuiCompressedFormRow>

                <EuiSpacer size="m" />

                <EuiCompressedFormRow
                  label={<FormFieldHeader headerTitle={"References"} />}
                  fullWidth={true}
                >
                  <EuiCompressedComboBox
                    placeholder="Type a reference URL and press Enter"
                    noSuggestions
                    selectedOptions={formikProps.values.references.map(
                      (ref) => ({ label: ref }),
                    )}
                    onCreateOption={(value) => {
                      formikProps.setFieldValue("references", [
                        ...formikProps.values.references,
                        value,
                      ]);
                    }}
                    onChange={(options) => {
                      formikProps.setFieldValue(
                        "references",
                        options.map((opt) => opt.label),
                      );
                    }}
                    data-test-subj="kvdb_references_field"
                  />
                </EuiCompressedFormRow>

                <EuiSpacer size="m" />

                <EuiCompressedFormRow
                  label={<FormFieldHeader headerTitle={"Enabled"} />}
                  fullWidth={true}
                >
                  <EuiCompressedSwitch
                    label={formikProps.values.enabled ? "Enabled" : "Disabled"}
                    checked={formikProps.values.enabled}
                    onChange={(e) =>
                      formikProps.setFieldValue("enabled", e.target.checked)
                    }
                    data-test-subj="kvdb_enabled_switch"
                  />
                </EuiCompressedFormRow>

                <EuiSpacer size="m" />

                <EuiCompressedFormRow
                  label={<FormFieldHeader headerTitle={"Content"} />}
                  fullWidth={true}
                >
                  <KVDBContentEditor />
                </EuiCompressedFormRow>
              </EuiPanel>

              <EuiSpacer size="xl" />

              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiSmallButton href={`#${ROUTES.KVDBS}`}>
                    Cancel
                  </EuiSmallButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={getSubmitTooltip(formikProps.errors)}
                    position="top"
                  >
                    <EuiSmallButton
                      disabled={isSubmitDisabled(formikProps.errors)}
                      onClick={() => formikProps.handleSubmit()}
                      fill
                    >
                      {actionLabels[action]} KVDB
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
