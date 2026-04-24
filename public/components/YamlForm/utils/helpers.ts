import YAML from 'yaml';
import { LosslessNumber } from 'lossless-json';

// Convert yaml string to a object model with floats with decimal precision
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

  // Transform the yaml into an object with lossless numbers
  const objectForm = yamlObject.toJS() as T;

  return objectForm;
};
