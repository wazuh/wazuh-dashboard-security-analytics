import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { Form, Formik, FormikErrors } from 'formik';
import YAML from 'yaml';
import { decoderFormDefaultValue } from '../utils/constants';
import {
  YamlForm,
  YAML_TYPE,
  mapYamlToLosslessObject,
  validateYamlSyntax,
  ERROR_SEVERITY,
} from '../../../components/YamlForm';
import {
  errorNotificationToast,
  getErrorMessage,
  setBreadcrumbs,
  successNotificationToast,
} from '../../../utils/helpers';
import { BREADCRUMBS, ROUTES } from '../../../utils/constants';
import { getReturnTo } from '../../../utils/routes';
import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import {
  IntegrationComboBox,
  IntegrationOption,
  useIntegrationSelector,
  usePreselectedIntegration,
} from '../../../components/IntegrationComboBox';
import { DecoderDocument } from '../../../../types/Decoders';
import { DataStore } from '../../../store/DataStore';
import { RouteComponentProps } from 'react-router-dom';
import { validateWithJsonSchemaAsync } from '../../../utils/jsonSchemaValidation';
import decoderSchema from '../../../../common/schemas/wazuh-decoders.schema.json';
import {
  DecoderEditorForm,
  DecoderFormModel,
  decoderEditorStateDefaultValue,
  mapDecoderToForm,
  mapFormToDecoder,
  routeSchemaErrors,
} from '../components/DecoderEditor';
import {
  collectStructuralErrors,
  hasStructuralErrors,
} from '../components/DecoderEditor/structuralValidation';

const EDITOR_TYPE = {
  VISUAL: 'visual',
  YAML: 'yaml',
} as const;

type EditorType = typeof EDITOR_TYPE[keyof typeof EDITOR_TYPE];

const editorTypes: Array<{ id: EditorType; label: string }> = [
  { id: EDITOR_TYPE.VISUAL, label: 'Visual Editor' },
  { id: EDITOR_TYPE.YAML, label: 'YAML Editor' },
];

type DecoderFormPageProps = {
  notifications: NotificationsStart;
  history: RouteComponentProps['history'];
  location?: RouteComponentProps['location'];
  action: 'create' | 'edit';
  id?: string;
  match: { params: { id: string } };
};

const actionLabels: Record<string, string> = {
  create: 'Create',
  edit: 'Edit',
};

const SCHEMA_VALIDATION_DEBOUNCE_MS = 300;

export const DecoderFormPage: React.FC<DecoderFormPageProps> = (props) => {
  const { notifications, history, action } = props;
  const idDecoder = props.match.params.id;
  const spaceDecoder = new URLSearchParams(props.location?.search).get('space') ?? '';
  // Wazuh: back to the Decoders list, unless the form was opened from elsewhere
  // (the Integration details Decoders tab) and that page asked for a return path.
  const returnTo = getReturnTo(history.location.search, ROUTES.DECODERS);
  // Wazuh: creation always targets Draft; on edit the space comes from the URL.
  const pageDescription =
    action === 'create'
      ? 'Create a new decoder to normalize logs from your selected integration. New decoders are created in the draft space.'
      : 'Edit the decoder to update the normalization of logs from your selected integration.' +
        (spaceDecoder
          ? ` This decoder is in the ${
              spaceDecoder.charAt(0).toUpperCase() + spaceDecoder.slice(1)
            } space.`
          : '');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEditorType, setSelectedEditorType] = useState<EditorType>(EDITOR_TYPE.VISUAL);
  const [integrationType, setIntegrationType] = useState<string>('');
  const [initialValues, setInitialValues] = useState<DecoderFormModel>(
    decoderEditorStateDefaultValue
  );
  // Wazuh: the document is the single source of truth and the YAML editor is a view
  // of it, matching the rules editor. Decoders are persisted as an object
  // (`documentJson`), so raw YAML text has no privileged status the way it does for
  // KVDBs and filters, which persist the text itself.
  // See docs/adr/0002-editor-source-of-truth-follows-persistence-format.md
  const [yamlSyntaxError, setYamlSyntaxError] = useState<string | null>(null);
  const [schemaWarnings, setSchemaWarnings] = useState<{
    fields: Record<string, string>;
    document: string[];
  }>({ fields: {}, document: [] });
  // Wazuh: on create the YAML view shows the starter template until something is
  // edited, so the guidance a YAML author has today is not lost to a form that
  // (correctly) starts empty.
  const [isPristineCreate, setIsPristineCreate] = useState(action === 'create');

  const {
    loading: loadingIntegrations,
    options: integrationTypeOptions,
    refresh: refreshIntegrations,
  } = useIntegrationSelector({ notifications });

  // Seed the selector from `?integration=<name>` when the form was opened
  // from an integration (its details page), leaving it empty otherwise.
  const preselectIntegration = useCallback(
    (option: IntegrationOption) => setIntegrationType(option.id),
    []
  );

  usePreselectedIntegration({
    search: props.location?.search,
    options: integrationTypeOptions,
    isLoading: loadingIntegrations,
    enabled: action === 'create',
    onPreselect: preselectIntegration,
  });

  useEffect(() => {
    const fetchDecoder = async () => {
      if (idDecoder) {
        setIsLoading(true);
        try {
          const response = await DataStore.decoders.getDecoder(idDecoder, spaceDecoder);
          const document = response?.yaml
            ? mapYamlToLosslessObject<DecoderDocument>(response.yaml)
            : response?.document;
          setInitialValues(mapDecoderToForm(document));
          setIntegrationType(response?.integrations?.[0] || '');
          setBreadcrumbs([
            BREADCRUMBS.NORMALIZATION,
            BREADCRUMBS.DECODERS,
            BREADCRUMBS.DECODERS_EDIT,
            // name the decoder in the trail. A breadcrumb has room for one
            // string, and the identifier is already on screen inside the form.
            { text: response?.document.metadata?.title || response?.document.name },
          ]);
        } catch (error) {
          errorNotificationToast(
            notifications,
            'retrieve',
            'decoder',
            getErrorMessage(
              error,
              `There was an error retrieving the decoder with id ${idDecoder}.`
            )
          );
        } finally {
          setIsLoading(false);
        }
      }
    };
    if (action === 'edit') {
      fetchDecoder();
    }
  }, [action, idDecoder, notifications]);

  useEffect(() => {
    if (action === 'create') {
      setBreadcrumbs([
        BREADCRUMBS.NORMALIZATION,
        BREADCRUMBS.DECODERS,
        BREADCRUMBS.DECODERS_CREATE,
      ]);
    }
  }, [action]);

  const onChange = useCallback((options: Array<{ id?: string }>) => {
    setIntegrationType(options[0]?.id || '');
  }, []);

  const onIntegrationCreateSuccess = useCallback(
    (newOption: { id: string }) => {
      refreshIntegrations();
      setIntegrationType(newOption.id);
    },
    [refreshIntegrations]
  );

  const createDecoder = useCallback(
    async (values: DecoderFormModel) => {
      const document = mapFormToDecoder(values);
      if (!integrationType) {
        errorNotificationToast(
          notifications,
          'retrieve',
          'decoder',
          'Decoder or integration type is missing'
        );
        return;
      }

      try {
        const result = await DataStore.decoders.createDecoder({
          document,
          integrationId: integrationType,
        });

        if (result) {
          successNotificationToast(
            notifications,
            'created',
            'decoder',
            result.message || `The decoder ${document.name} has been created successfully.`
          );

          history.push(returnTo);
        }
      } catch (error: any) {
        errorNotificationToast(
          notifications,
          'create',
          'decoder',
          getErrorMessage(error, 'An unexpected error occurred while creating the decoder.')
        );
      }
    },
    [integrationType, notifications, history, returnTo]
  );

  const updateDecoder = useCallback(
    async (values: DecoderFormModel) => {
      const document = mapFormToDecoder(values);

      try {
        const result = await DataStore.decoders.updateDecoder(idDecoder, { document });

        if (result) {
          successNotificationToast(
            notifications,
            'updated',
            'decoder',
            result.message || `The decoder ${document.name} has been updated successfully.`
          );

          history.push(returnTo);
        }
      } catch (error: any) {
        errorNotificationToast(
          notifications,
          'update',
          'decoder',
          getErrorMessage(error, 'An unexpected error occurred while updating the decoder.')
        );
      }
    },
    [idDecoder, notifications, history, returnTo]
  );

  const handleOnClick = useCallback(
    async (values: DecoderFormModel) => {
      if (action === 'create') {
        await createDecoder(values);
      } else if (action === 'edit') {
        await updateDecoder(values);
      }
    },
    [action, createDecoder, updateDecoder]
  );

  /**
   * The blocking tier. Formik's own errors carry only what makes a document
   * impossible to build, so `isValid` can gate submission directly. Schema
   * violations are the advisory tier and live in `schemaWarnings`.
   */
  const validateForm = useCallback((values: DecoderFormModel) => {
    const structural = collectStructuralErrors(values);
    return (hasStructuralErrors(structural) ? (structural.fields as unknown) : {}) as FormikErrors<
      DecoderFormModel
    >;
  }, []);

  return (
    <>
      {isLoading ? (
        <EuiPanel>
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '400px' }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      ) : (
        <Formik
          key={initialValues.id || 'new-decoder'}
          initialValues={initialValues}
          validateOnMount={true}
          enableReinitialize={true}
          validate={validateForm}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              await handleOnClick(values);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {(formikProps) => (
            <DecoderFormBody
              action={action}
              formikProps={formikProps}
              pageDescription={pageDescription}
              returnTo={returnTo}
              selectedEditorType={selectedEditorType}
              setSelectedEditorType={setSelectedEditorType}
              yamlSyntaxError={yamlSyntaxError}
              setYamlSyntaxError={setYamlSyntaxError}
              schemaWarnings={schemaWarnings}
              setSchemaWarnings={setSchemaWarnings}
              isPristineCreate={isPristineCreate}
              setIsPristineCreate={setIsPristineCreate}
              integrationType={integrationType}
              integrationTypeOptions={integrationTypeOptions}
              loadingIntegrations={loadingIntegrations}
              onIntegrationChange={onChange}
              onIntegrationCreateSuccess={onIntegrationCreateSuccess}
              notifications={notifications}
              handleOnClick={handleOnClick}
            />
          )}
        </Formik>
      )}
    </>
  );
};

interface DecoderFormBodyProps {
  action: 'create' | 'edit';
  formikProps: any;
  pageDescription: string;
  returnTo: string;
  selectedEditorType: EditorType;
  setSelectedEditorType: (type: EditorType) => void;
  yamlSyntaxError: string | null;
  setYamlSyntaxError: (error: string | null) => void;
  schemaWarnings: { fields: Record<string, string>; document: string[] };
  setSchemaWarnings: (warnings: { fields: Record<string, string>; document: string[] }) => void;
  isPristineCreate: boolean;
  setIsPristineCreate: (pristine: boolean) => void;
  integrationType: string;
  integrationTypeOptions: any[];
  loadingIntegrations: boolean;
  onIntegrationChange: (options: Array<{ id?: string }>) => void;
  onIntegrationCreateSuccess: (option: { id: string }) => void;
  notifications: NotificationsStart;
  handleOnClick: (values: DecoderFormModel) => Promise<void>;
}

const DecoderFormBody: React.FC<DecoderFormBodyProps> = ({
  action,
  formikProps,
  pageDescription,
  returnTo,
  selectedEditorType,
  setSelectedEditorType,
  yamlSyntaxError,
  setYamlSyntaxError,
  schemaWarnings,
  setSchemaWarnings,
  isPristineCreate,
  setIsPristineCreate,
  integrationType,
  integrationTypeOptions,
  loadingIntegrations,
  onIntegrationChange,
  onIntegrationCreateSuccess,
  notifications,
  handleOnClick,
}) => {
  const values: DecoderFormModel = formikProps.values;
  const validationSeq = useRef(0);

  // The advisory tier: JSON Schema validation of the document the form would
  // produce. Debounced and out of band, so it never gates typing, and only the
  // newest result is applied.
  useEffect(() => {
    const seq = ++validationSeq.current;
    const timer = window.setTimeout(async () => {
      const document = mapFormToDecoder(values);
      const skippedFields = action === 'create' ? ['id'] : [];
      const errors = await validateWithJsonSchemaAsync(decoderSchema, document, {
        skipRequired: skippedFields,
      });
      if (seq !== validationSeq.current) return;
      setSchemaWarnings(routeSchemaErrors(errors as Record<string, string>, values));
    }, SCHEMA_VALIDATION_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [values, action, setSchemaWarnings]);

  const yamlText = useMemo(() => {
    if (action === 'create' && isPristineCreate) return decoderFormDefaultValue;
    return YAML.stringify(mapFormToDecoder(values), { lineWidth: 0 }).trimEnd();
  }, [values, action, isPristineCreate]);

  const onYamlChange = useCallback(
    (text: string) => {
      const syntaxError = validateYamlSyntax(text);
      setYamlSyntaxError(syntaxError);
      // Unparseable YAML never reaches the document, matching the rules editor:
      // toggling back to the visual editor shows the last valid state.
      if (syntaxError) return;
      setIsPristineCreate(false);
      formikProps.setValues(mapDecoderToForm(mapYamlToLosslessObject<DecoderDocument>(text)));
    },
    [formikProps, setYamlSyntaxError, setIsPristineCreate]
  );

  const onVisualChange = useCallback(
    (next: DecoderFormModel) => {
      setIsPristineCreate(false);
      formikProps.setValues(next);
    },
    [formikProps, setIsPristineCreate]
  );

  const structuralErrors: Record<string, string> = formikProps.errors ?? {};
  const structuralCount = Object.keys(structuralErrors).length;
  const warningCount = Object.keys(schemaWarnings.fields).length + schemaWarnings.document.length;

  const isSubmitBlocked =
    !integrationType ||
    structuralCount > 0 ||
    (selectedEditorType === EDITOR_TYPE.YAML && yamlSyntaxError !== null);

  const submitTooltip = (): string | undefined => {
    if (!integrationType) return 'Select an integration to proceed';
    if (selectedEditorType === EDITOR_TYPE.YAML && yamlSyntaxError) {
      return 'Fix the YAML error to proceed';
    }
    if (structuralCount > 0) return 'Fix the highlighted errors to proceed';
    return undefined;
  };

  return (
    <Form>
      <EuiPanel className={'rule-editor-form'} style={{ paddingBottom: '60px' }}>
        <PageHeader appDescriptionControls={[{ description: pageDescription }]}>
          <EuiText size="s">
            <h1>{actionLabels[action]} decoder</h1>
          </EuiText>

          <EuiText size="s" color="subdued">
            {pageDescription}
          </EuiText>

          <EuiSpacer size="m" />
        </PageHeader>

        <EuiButtonGroup
          data-test-subj="change-editor-type"
          legend="This is editor type selector"
          options={editorTypes}
          idSelected={selectedEditorType}
          onChange={(id) => setSelectedEditorType(id as EditorType)}
        />

        <EuiSpacer size="m" />

        {action === 'create' && (
          <>
            <IntegrationComboBox
              options={integrationTypeOptions}
              selectedId={integrationType}
              isLoading={loadingIntegrations}
              onChange={onIntegrationChange}
              resourceName="decoders"
              data-test-subj="integration_dropdown"
              notifications={notifications}
              onCreateSuccess={onIntegrationCreateSuccess}
            />
            <EuiSpacer size="m" />
          </>
        )}

        {selectedEditorType === EDITOR_TYPE.VISUAL && (
          <DecoderEditorForm
            values={values}
            onChange={onVisualChange}
            fieldErrors={{ ...schemaWarnings.fields, ...structuralErrors }}
            documentErrors={schemaWarnings.document}
          />
        )}

        {selectedEditorType === EDITOR_TYPE.YAML && (
          <YamlForm
            errorSeverity={ERROR_SEVERITY.WARNING}
            type={YAML_TYPE.DECODER}
            value={yamlText}
            isInvalid={yamlSyntaxError !== null || warningCount > 0}
            errors={
              yamlSyntaxError
                ? [yamlSyntaxError]
                : [...Object.values(schemaWarnings.fields), ...schemaWarnings.document]
            }
            change={onYamlChange}
          />
        )}
      </EuiPanel>

      <EuiBottomBar>
        <EuiFlexGroup
          gutterSize="s"
          justifyContent="flexEnd"
          alignItems="center"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="ghost"
              size="s"
              iconType="cross"
              href={`#${returnTo}`}
              isDisabled={formikProps.isSubmitting}
            >
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={submitTooltip()} position="top">
              <EuiButton
                color="primary"
                fill
                iconType="check"
                size="s"
                disabled={isSubmitBlocked}
                isLoading={formikProps.isSubmitting}
                onClick={formikProps.submitForm}
                data-test-subj="submit-decoder"
              >
                {actionLabels[action]} decoder
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBottomBar>
    </Form>
  );
};
