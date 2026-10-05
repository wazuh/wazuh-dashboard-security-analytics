/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/** Which fields have been visited. Schema errors are not Formik's, so this is by hand. */
export interface TouchedState {
  paths: Set<string>;
  /** True once submission was attempted; every error shows from then on. */
  submitted: boolean;
}

export const emptyTouched = (): TouchedState => ({ paths: new Set(), submitted: false });

/** A path counts as touched when it, or any ancestor or descendant, was blurred. */
export const isTouched = (touched: TouchedState, path: string): boolean => {
  if (touched.submitted) return true;
  if (touched.paths.has(path)) return true;
  for (const visited of touched.paths) {
    if (visited.startsWith(`${path}.`) || visited.startsWith(`${path}[`)) return true;
    if (path.startsWith(`${visited}.`) || path.startsWith(`${visited}[`)) return true;
  }
  return false;
};

export const visibleErrors = (
  errors: Record<string, string>,
  touched: TouchedState
): Record<string, string> => {
  if (touched.submitted) return errors;
  return Object.fromEntries(Object.entries(errors).filter(([path]) => isTouched(touched, path)));
};

export const withTouched = (touched: TouchedState, path: string): TouchedState => {
  if (touched.paths.has(path)) return touched;
  const paths = new Set(touched.paths);
  paths.add(path);
  return { ...touched, paths };
};
