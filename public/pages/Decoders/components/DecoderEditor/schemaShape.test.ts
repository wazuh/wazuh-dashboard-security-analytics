/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import decoderSchema from '../../../../../common/schemas/wazuh-decoders.schema.json';

/**
 * Grammar guard.
 *
 * `common/schemas/*.schema.json` is gitignored and refetched on install, so the
 * grammar can change with no diff. This snapshot is the only version-controlled
 * record of it. A failure means the engine changed shape: read the diff, decide
 * whether the editor needs to model something new, then update it.
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
    // ~99% of the file, and only field names. Grammar here would matter.
    const fields = schema.definitions?._fieldsDecoder;
    expect(fields?.additionalProperties).toBe(false);
    expect(Object.keys(fields?.patternProperties ?? {})).toEqual(['^_.+']);
    expect(fields?.oneOf).toBeUndefined();
    expect(fields?.anyOf).toBeUndefined();
  });
});
