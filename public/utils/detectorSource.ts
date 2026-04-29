/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Wazuh: centralised vocabulary for the detector / logtype `source` (a.k.a. "space") field.

/** Raw values stored in the indexer (legacy `Sigma` kept for pre-normalization data). */
export enum DetectorSourceRaw {
  /** Legacy value for the read-only/standard space. */
  Sigma = "Sigma",
  Standard = "standard",
  Custom = "Custom",
}

/** Labels rendered in the UI  */
export enum DetectorSourceLabel {
  Standard = "Standard",
  Custom = "Custom",
}

/** Raw → UI label mapping. Anything not listed falls back to the raw value. */
export const DETECTOR_SOURCE_LABEL_BY_RAW: Readonly<
  Record<string, DetectorSourceLabel>
> = {
  [DetectorSourceRaw.Sigma.toLowerCase()]: DetectorSourceLabel.Standard,
  [DetectorSourceRaw.Standard.toLowerCase()]: DetectorSourceLabel.Standard,
  [DetectorSourceRaw.Custom.toLowerCase()]: DetectorSourceLabel.Custom,
};

/** Returns the UI label for a raw `source` value, or `undefined` if not provided. */
export const getDetectorSourceLabel = (
  raw: string | undefined
): string | undefined => {
  if (!raw) return undefined;
  return DETECTOR_SOURCE_LABEL_BY_RAW[raw.toLowerCase()] ?? raw;
};

/** True for read-only/standard detectors (accepts legacy `Sigma` and normalized `standard`). */
export const isStandardSource = (raw: string | undefined): boolean => {
  const v = raw?.toLowerCase();
  return (
    v === DetectorSourceRaw.Sigma.toLowerCase() ||
    v === DetectorSourceRaw.Standard.toLowerCase()
  );
};
