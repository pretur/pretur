import { createTargetedActionDescriptor, TargetedActionDescriptor } from 'pretur.redux';
import { I18nBundle } from 'pretur.i18n';

export interface RelationInjectrionPayload {
  inexistent: boolean;
  attribute: string;
  value: any;
}

export const CLAY_DATA_CLEAR: TargetedActionDescriptor<void, void>
  = createTargetedActionDescriptor<void, void>('CLAY_DATA_CLEAR');

export const CLAY_DATA_DECAY: TargetedActionDescriptor<void, void>
  = createTargetedActionDescriptor<void, void>('CLAY_DATA_DECAY');

export const CLAY_DATA_SET_VALUE: TargetedActionDescriptor<any, void>
  = createTargetedActionDescriptor<any, void>('CLAY_DATA_SET_VALUE');

export const CLAY_DATA_SET_ERROR: TargetedActionDescriptor<I18nBundle, void>
  = createTargetedActionDescriptor<I18nBundle, void>('CLAY_DATA_SET_ERROR');

export const CLAY_DATA_RESET: TargetedActionDescriptor<any[], void>
  = createTargetedActionDescriptor<any[], void>('CLAY_DATA_RESET');

export const CLAY_DATA_ADD_ITEM: TargetedActionDescriptor<any, void>
  = createTargetedActionDescriptor<any, void>('CLAY_DATA_ADD_ITEM');

export const CLAY_DATA_REMOVE_ITEM: TargetedActionDescriptor<number, void>
  = createTargetedActionDescriptor<number, void>('CLAY_DATA_REMOVE_ITEM');

export const CLAY_DATA_INJECT_RELATION: TargetedActionDescriptor<RelationInjectrionPayload, void>
  = createTargetedActionDescriptor<RelationInjectrionPayload, void>('CLAY_DATA_INJECT_RELATION');
