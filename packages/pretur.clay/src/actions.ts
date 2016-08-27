import { createTargetedActionDescriptor, TargetedActionDescriptor } from 'pretur.redux';

export * from './data/actions';
export * from './query/actions';

export const CLAY_REACTIVE_REFRESH: TargetedActionDescriptor<void, void>
  = createTargetedActionDescriptor<void, void>('CLAY_REACTIVE_REFRESH');

export const CLAY_REACTIVE_SET_COUNT: TargetedActionDescriptor<number, void>
  = createTargetedActionDescriptor<number, void>('CLAY_REACTIVE_SET_COUNT');

export const CLAY_REACTIVE_SET_INITIALIZED: TargetedActionDescriptor<void, void>
  = createTargetedActionDescriptor<void, void>('CLAY_REACTIVE_SET_INITIALIZED');
