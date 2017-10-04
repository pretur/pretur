import { Bundle } from 'pretur.i18n';
import { Reducer, Reducible, Action } from 'pretur.redux';
import { PageInstantiationData, PageDescriptor } from './pages';

interface PageInstanceParams<TProps, TState, TReducerBuilderData> {
  reducer: Reducer<TState>;
  instantiationData: PageInstantiationData<TReducerBuilderData>;
  descriptor: PageDescriptor<TProps, TState, TReducerBuilderData>;
  title: Bundle;
}

export class PageInstance<TProps, TState, TReducerBuilderData>
  implements Reducible<PageInstance<TProps, TState, TReducerBuilderData>> {
  private params: PageInstanceParams<TProps, TState, TReducerBuilderData>;
  private currentState: TState;

  constructor(
    descriptor: PageDescriptor<TProps, TState, TReducerBuilderData> | undefined,
    instantiationData: PageInstantiationData<TReducerBuilderData> | undefined,
  ) {
    if (descriptor === undefined || instantiationData === undefined) {
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

  public get path(): string {
    return this.params.descriptor.path;
  }

  public get mutex(): string {
    return this.params.instantiationData.mutex;
  }

  public get parent(): string | undefined {
    return this.params.instantiationData.parent;
  }

  public get openedFrom(): string | undefined {
    return this.params.instantiationData.openedFrom;
  }

  public get title(): Bundle {
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

    const clone = <this>new PageInstance(undefined, undefined);
    clone.params = this.params;
    clone.currentState = newState;
    return clone;
  }

}
