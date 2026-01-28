import { dump } from 'js-yaml';
import { DecoderDocument } from '../../../../types/Decoders';

export interface DecoderFormModel {
  id?: string;
  name: string;
  description?: string;
  source?: string;
  program_name?: string;
  order?: number;
  fields?: Record<string, any>;
  parent?: string;
  regex?: string;
  prematch?: string;
  decoder?: any;
}

export const decoderFormDefaultValue: DecoderFormModel = {
  name: '',
  description: '',
  source: '',
  program_name: '',
  order: 0,
  fields: {},
};

export const mapFormToDecoder = (formState: DecoderFormModel): DecoderDocument => {
  return {
    id: formState.id,
    name: formState.name,
    description: formState.description,
    source: formState.source,
    program_name: formState.program_name,
    order: formState.order,
    fields: formState.fields,
    parent: formState.parent,
    regex: formState.regex,
    prematch: formState.prematch,
    decoder: formState.decoder,
  } as DecoderDocument;
};

export const mapDecoderToForm = (decoder: DecoderFormModel): DecoderFormModel => {
  return {
    id: decoder.id,
    name: decoder.name || '',
    description: decoder.description,
    source: decoder.source,
    program_name: decoder.program_name,
    order: decoder.order,
    fields: decoder.fields,
    parent: decoder.parent,
    regex: decoder.regex,
    prematch: decoder.prematch,
    decoder: decoder.decoder,
  };
};

export const mapYamlObjectToYamlString = (decoder: DecoderFormModel): string => {
  try {
    if (!decoder.decoder) {
      const { decoder: decoderField, ...decoderWithoutDecoder } = decoder;
      return dump(decoderWithoutDecoder);
    } else {
      return dump(decoder);
    }
  } catch (error: any) {
    console.warn('Security Analytics - Decoder Editor - Yaml dump', error);
    return '';
  }
};

export const mapDecoderToYamlObject = (decoder: DecoderFormModel): any => {
  const yamlObject: any = {
    id: decoder?.id || '',
    name: decoder?.name || '',
    description: decoder?.description || '',
    source: decoder?.source || '',
    program_name: decoder?.program_name || '',
    order: decoder?.order || 0,
    fields: decoder?.fields || {},
    parent: decoder?.parent || '',
    regex: decoder?.regex || '',
    prematch: decoder?.prematch || '',
    decoder: decoder?.decoder || '',
  };

  return yamlObject;
};

export const mapYamlObjectToDecoder = (obj: any): DecoderFormModel => {
  const decoderForm: DecoderFormModel = {
    id: obj.id,
    name: obj.name,
    description: obj.description,
    source: obj.source,
    program_name: obj.program_name,
    order: obj.order,
    fields: obj.fields,
    parent: obj.parent,
    regex: obj.regex,
    prematch: obj.prematch,
    decoder: obj.decoder,
  };

  return decoderForm;
};