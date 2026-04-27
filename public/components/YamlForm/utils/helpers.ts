import YAML from 'yaml';
import { LosslessNumber } from 'lossless-json';

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
