import YAML, { Pair, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import { LosslessNumber } from 'lossless-json';

/**
 * Converts a raw user-input string into a YAML AST node with proper type metadata.
 * Preserves float/int/bool/null representations that would otherwise be lost when
 * passing through JS native types (e.g. "5.0" to !!float 5.0, not int 5).
 * JSON objects/arrays are parsed via JSON.parse then re-serialized as YAML.
 */
export const stringToYamlNode = (rawValue: string): Scalar | YAMLMap | YAMLSeq => {
  const trimmed = rawValue.trim();
  if (trimmed && (trimmed[0] === '{' || trimmed[0] === '[')) {
    try {
      const parsed = YAML.parseDocument(trimmed);
      if (!parsed.errors.length && parsed.contents) {
        return parsed.contents as YAMLMap | YAMLSeq;
      }
    } catch {
      // not valid YAML
    }
  }
  try {
    return (YAML.parseDocument(trimmed).contents ?? new Scalar(trimmed)) as
      | Scalar
      | YAMLMap
      | YAMLSeq;
  } catch {
    return new Scalar(trimmed);
  }
};

export const mapYamlToLosslessObject = <T>(yamlString: string): T => {
  const yamlObject = YAML.parseDocument(yamlString);

  YAML.visit(yamlObject, {
    Scalar(_, node) {
      if (typeof node.value === 'number') {
        let rawText;

        if (node.range && node.range.length >= 2) {
          rawText = yamlString.slice(node.range[0], node.range[1]).trim();
        }

        if (!rawText) {
          rawText = String(node.value);
          if (!rawText.includes('.')) rawText += '.0';
        }

        node.value = new LosslessNumber(rawText);
      }
    },
  });

  return yamlObject.toJS() as T;
};
