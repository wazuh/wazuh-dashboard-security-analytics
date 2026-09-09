/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import decoderSchema from '../../../../../common/schemas/wazuh-decoders.schema.json';

/**
 * Grammar guard.
 *
 * `common/schemas/*.schema.json` is gitignored and refetched from `wazuh/wazuh` on
 * every `yarn install` and `prebuild`, so the decoder grammar can change with no
 * diff and no review — while the visual editor models that grammar by hand.
 *
 * The snapshot below is therefore the only version-controlled record of the grammar
 * in this repository. When it fails, the engine changed shape: read the diff, decide
 * whether `DecoderEditor` needs to model something new, then update the snapshot.
 * A failure on a PR that did not touch decoders is expected and is the point.
 *
 * It deliberately captures *shape* only — key names, required sets, branch shapes —
 * and not the ECS field catalog, which changes constantly and is not modelled here.
 */

const schema = decoderSchema as any;

const sorted = (values: string[] = []): string[] => [...values].sort();

const grammarFingerprint = () => ({
  rootKeys: sorted(Object.keys(schema.properties ?? {})),
  rootRequired: sorted(schema.required),
  rootPatternProperties: sorted(Object.keys(schema.patternProperties ?? {})),
  rootAdditionalProperties: schema.additionalProperties,

  namePattern: schema.properties?.name?.pattern,

  metadataKeys: sorted(Object.keys(schema.properties?.metadata?.properties ?? {})),
  metadataRequired: sorted(schema.properties?.metadata?.required),
  metadataAdditionalProperties: schema.properties?.metadata?.additionalProperties,

  checkBranches: (schema.definitions?._check?.anyOf ?? []).map((branch: any) => branch.$ref),

  normalizeItemRef: schema.properties?.normalize?.items?.$ref,
  normalizeBlockBranches: (schema.definitions?._normalizeBlock?.oneOf ?? []).map((branch: any) => ({
    required: sorted(branch.required),
    properties: sorted(Object.keys(branch.properties ?? {})),
    patternProperties: sorted(Object.keys(branch.patternProperties ?? {})),
    minProperties: branch.minProperties,
  })),

  parseItemsType: schema.definitions?._parse?.items?.type,
});

describe('engine decoder grammar', () => {
  it('has the shape the visual editor models', () => {
    expect(grammarFingerprint()).toMatchSnapshot();
  });

  it('still uses the field catalog only as a catalog, not as grammar', () => {
    // `_fieldsDecoder` is ~99% of the file and is a list of ECS field names. If it
    // ever grows grammar of its own, the editor's assumptions need revisiting.
    const fields = schema.definitions?._fieldsDecoder;
    expect(fields?.additionalProperties).toBe(false);
    expect(Object.keys(fields?.patternProperties ?? {})).toEqual(['^_.+']);
    expect(fields?.oneOf).toBeUndefined();
    expect(fields?.anyOf).toBeUndefined();
  });
});
