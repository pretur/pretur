import { I18nBundle } from 'pretur.i18n';
import { Reducer, Reducible, Action } from 'pretur.redux';
import { PageInstantiationData, PageDescriptor } from './pages';

interface PageInstanceParams<TProps, TState, TReducerBuilderData> {
  reducer: Reducer<TState>;
  instantiationData: PageInstantiationData<TReducerBuilderData>;
  descriptor: PageDescriptor<TProps, TState, TReducerBuilderData>;
  title: I18nBundle;
}

export class PageInstance<TProps, TState, TReducerBuilderData> implements Reducible {
  private params: PageInstanceParams<TProps, TState, TReducerBuilderData>;
  private currentState: TState;

  constructor(
    descriptor: PageDescriptor<TProps, TState, TReducerBuilderData> | null,
    instantiationData: PageInstantiationData<TReducerBuilderData> | null,
  ) {
    if (descriptor === null || instantiationData === null) {
      return;
    }

    const reducer = descriptor.reducerBuilder(instantiationData.reducerBuilderData);
    this.currentState = reducer(undefined, { type: '@@INIT_PAGE' });

    if (this.currentState === undefined) {
      throw new Error('The reducer did not return the initial state.');
    }

    this.params = {
      descriptor,
      instantiationData,
      reducer,
      title: { data: instantiationData.titleData, key: descriptor.titleKey },
    };
  }

  public get mutex(): string {
    return this.params.instantiationData.mutex;
  }

  public get path(): string {
    return this.params.descriptor.path;
  }

  public get title(): I18nBundle {
    return this.params.title;
  }

  public get state(): TState {
    return this.currentState;
  }

  public get descriptor(): PageDescriptor<TProps, TState, TReducerBuilderData> {
    return this.params.descriptor;
  }

  public get instantiationData(): PageInstantiationData<TReducerBuilderData> {
    return this.params.instantiationData;
  }

  public reduce(action: Action<any, any>): this {
    const newState = this.params.reducer(this.state, action);
    if (newState === this.state) {
      return this;
    }

    const clone = <this>new PageInstance(null, null);
    clone.params = this.params;
    clone.currentState = newState;
    return clone;
  }

}
