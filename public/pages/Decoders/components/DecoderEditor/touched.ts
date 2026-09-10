/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Which fields the user has actually visited.
 *
 * The filter and KVDB forms gate every error on `touched.<field>`, so a form
 * opened for the first time is quiet even though validation has already run. This
 * editor's errors come from the JSON Schema rather than from Formik's own
 * validation, so they need the same gate applied by hand.
 *
 * A field is shown its error once it has been blurred, or once submission has been
 * attempted — matching `KVDBContentEditor`, which uses `submitCount > 0` for the
 * rows a user may never focus.
 */
export interface TouchedState {
  /** Formik-style paths that have been blurred, e.g. `metadata.title`. */
  paths: Set<string>;
  /** True once the user has tried to submit; every error shows from then on. */
  submitted: boolean;
}

export const emptyTouched = (): TouchedState => ({ paths: new Set(), submitted: false });

/**
 * Decides whether a field may show its error.
 *
 * A path counts as touched when it, or any ancestor of it, has been blurred: an
 * error routed to `normalize[0].map[0]` should appear once that row was visited,
 * and a section-level error once anything inside the section was.
 */
export const isTouched = (touched: TouchedState, path: string): boolean => {
  if (touched.submitted) return true;
  if (touched.paths.has(path)) return true;
  for (const visited of touched.paths) {
    if (visited.startsWith(`${path}.`) || visited.startsWith(`${path}[`)) return true;
    if (path.startsWith(`${visited}.`) || path.startsWith(`${visited}[`)) return true;
  }
  return false;
};

/** Keeps only the errors whose field the user has visited. */
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
