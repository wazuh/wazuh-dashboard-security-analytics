export interface YamlEditorState {
  errors: string[] | null;
  value?: string;
}

// Wazuh: these values are interpolated into labels and prose, so they carry the
// casing the copy needs: lowercase mid-sentence, except the KVDB acronym.
export enum YAML_TYPE {
  DECODER = 'decoder',
  FILTER = 'filter',
  KVDB = 'KVDB',
}
