import {
  getAlgoliaResults,
  getAlgoliaHits,
  getAlgoliaFacetHits,
} from '@algolia/autocomplete-js';
import { invariant } from '@algolia/autocomplete-shared';

import {
  AutocompleteScopeApi,
  AutocompleteState,
  AutocompleteStore,
  BaseItem,
  InternalAutocompleteOptions,
} from './types';
import { getActiveItem } from './utils';

let lastStalledId: number | null = null;

interface OnInputParams<TItem extends BaseItem>
  extends AutocompleteScopeApi<TItem> {
  event: any;
  /**
   * The next partial state to apply after the function is called.
   *
   * This is useful when we call `onInput` in a different scenario than an
   * actual input. For example, we use `onInput` when we click on an item,
   * but we want to close the panel in that case.
   */
  nextState?: Partial<AutocompleteState<TItem>>;
  props: InternalAutocompleteOptions<TItem>;
  query: string;
  store: AutocompleteStore<TItem>;
}

export function onInput<TItem extends BaseItem>({
  event,
  nextState = {},
  props,
  query,
  refresh,
  store,
  ...setters
}: OnInputParams<TItem>): Promise<void> {
  if (lastStalledId) {
    props.environment.clearTimeout(lastStalledId);
  }

  const {
    setCollections,
    setIsOpen,
    setQuery,
    setActiveItemId,
    setStatus,
  } = setters;

  setQuery(query);
  setActiveItemId(props.defaultActiveItemId);

  if (!query && props.openOnFocus === false) {
    setStatus('idle');
    setCollections(
      store.getState().collections.map((collection) => ({
        ...collection,
        items: [],
      }))
    );
    setIsOpen(
      nextState.isOpen ?? props.shouldPanelOpen({ state: store.getState() })
    );

    return Promise.resolve();
  }

  setStatus('loading');

  lastStalledId = props.environment.setTimeout(() => {
    setStatus('stalled');
  }, props.stallThreshold);

  return props
    .getSources({
      query,
      refresh,
      state: store.getState(),
      ...setters,
    })
    .then((sources) => {
      setStatus('loading');

      return (
        execute(
          sources.map((source) =>
            source.getItems({
              query,
              refresh,
              state: store.getState(),
              ...setters,
            })
          )
        )
          .then((itemsWrapper) => {
            console.log('itemsWrapper', itemsWrapper);

            return itemsWrapper.map((items, index) => {
              console.log({ items });
              invariant(
                Array.isArray(items),
                `The \`getItems\` function must return an array of items but returned type ${JSON.stringify(
                  typeof items
                )}:\n\n${JSON.stringify(items, null, 2)}`
              );

              return { source: sources[index], items };
            });
          })
          // return Promise.all(
          //   sources.map((source) => {
          //     return Promise.resolve(
          //       source.getItems({
          //         query,
          //         refresh,
          //         state: store.getState(),
          //         ...setters,
          //       })
          //     ).then((items) => {
          //       invariant(
          //         Array.isArray(items),
          //         `The \`getItems\` function must return an array of items but returned type ${JSON.stringify(
          //           typeof items
          //         )}:\n\n${JSON.stringify(items, null, 2)}`
          //       );

          //       return { source, items };
          //     });
          //   })
          // )
          .then((collections) => {
            setStatus('idle');
            setCollections(collections as any);
            const isPanelOpen = props.shouldPanelOpen({
              state: store.getState(),
            });
            setIsOpen(
              nextState.isOpen ??
                ((props.openOnFocus && !query && isPanelOpen) || isPanelOpen)
            );

            const highlightedItem = getActiveItem(store.getState());

            if (store.getState().activeItemId !== null && highlightedItem) {
              const { item, itemInputValue, itemUrl, source } = highlightedItem;

              source.onActive({
                event,
                item,
                itemInputValue,
                itemUrl,
                refresh,
                source,
                state: store.getState(),
                ...setters,
              });
            }
          })
          .finally(() => {
            if (lastStalledId) {
              props.environment.clearTimeout(lastStalledId);
            }
          })
      );
    });
}

type ItemsDescriptionType =
  | 'algoliaResults'
  | 'algoliaHits'
  | 'algoliaFacetHits';

type ItemsDescription = {
  id?: number;
  $$typeof: ItemsDescriptionType;
  searchClient: any;
  queries: any[];
  execute?(x: any): any;
};

const identity = (x: unknown) => x;

async function execute<TItem>(
  descriptions: ItemsDescription[]
): Promise<TItem[] | TItem[][]> {
  const batchedDescriptions: ItemsDescription[] = descriptions.reduce<
    ItemsDescription[]
  >((acc, description, descriptionId) => {
    if (!description.$$typeof) {
      return acc.push({ id: descriptionId, ...description });
    }

    const requestWrapper = acc.find(
      (item) => item.searchClient === description.searchClient
    );

    if (requestWrapper) {
      requestWrapper.queries.push(
        ...description.queries.map((x) => ({
          ...x,
          __autocomplete_queryId: descriptionId,
        }))
      );
    } else {
      acc.push({
        ...description,
        queries: description.queries.map((x) => ({
          ...x,
          __autocomplete_queryId: descriptionId,
        })),
      });
    }

    return acc;
  }, []);

  // console.log({ batchedDescriptions });

  const responses = [];

  for (const instruction of batchedDescriptions) {
    if (!instruction.$$typeof) {
      responses.push(Promise.resolve(instruction));
    } else if (
      instruction.$$typeof === 'algoliaResults' ||
      instruction.$$typeof === 'algoliaHits'
    ) {
      const results = await getAlgoliaResults({
        searchClient: instruction.searchClient,
        queries: instruction.queries,
      });
      console.log('results', results);

      instruction.queries.forEach((_query, index) => {
        if (instruction.$$typeof === 'algoliaHits') {
          responses.push(results[index].hits);
        } else {
          responses.push(results[index]);
        }
      });
    }
  }

  // const responses = batchedDescriptions.reduce(async (acc, instruction) => {
  //   console.log('instruction', instruction);

  //   if (!instruction.$$typeof) {
  //     acc.push(Promise.resolve(instruction));
  //   } else if (
  //     instruction.$$typeof === 'algoliaResults' ||
  //     instruction.$$typeof === 'algoliaHits'
  //   ) {
  //     const results = await getAlgoliaResults({
  //       searchClient: instruction.searchClient,
  //       queries: instruction.queries,
  //     });
  //     console.log('results', results);

  //     instruction.queries.forEach((_query, index) => {
  //       if (instruction.$$typeof === 'algoliaHits') {
  //         acc.push(results[index].hits);
  //       } else {
  //         acc.push(results[index]);
  //       }
  //     });
  //   }

  //   return acc;
  // }, []);

  console.log('responses', responses);

  return Promise.all(responses);

  return Promise.all<any>(
    descriptions.map((description) => {
      if (!description.$$typeof) {
        return Promise.resolve(description);
      }

      switch (description.$$typeof) {
        case 'algoliaResults': {
          return getAlgoliaResults({
            searchClient: description.searchClient,
            queries: description.queries,
          }).then(description.execute ?? identity);
        }

        case 'algoliaHits': {
          return getAlgoliaHits({
            searchClient: description.searchClient,
            queries: description.queries,
          }).then(description.execute ?? identity);
        }

        case 'algoliaFacetHits': {
          return getAlgoliaFacetHits({
            searchClient: description.searchClient,
            queries: description.queries,
          }).then(description.execute ?? identity);
        }

        default: {
          throw new Error(
            `Requester description for ${JSON.stringify(
              description.$$typeof
            )} does not exist.`
          );
        }
      }
    })
  );
}
