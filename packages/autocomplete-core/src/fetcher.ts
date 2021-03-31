import type {
  MultipleQueriesQuery,
  SearchResponse,
} from '@algolia/client-search';
import type { SearchClient } from 'algoliasearch';
import { getAlgoliaResults } from '../../autocomplete-js/src';

type FetcherType = 'algoliaHits' | 'algoliaResults' | 'other'; // | 'algoliaFacetHits';

type Description<TData, TType extends FetcherType> = {
  sourceId: string;
  results: {
    $$type: TType;
  } & TData;
};

type AlgoliaQuery = {
  searchClient: SearchClient;
  queries: MultipleQueriesQuery[];
};

export type AlgoliaDescription = Description<
  AlgoliaQuery,
  'algoliaHits' | 'algoliaResults'
>;

type RichAlgoliaDescription = {
  $$type: 'algoliaHits' | 'algoliaResults';
  searchClient: SearchClient;
  queries: WithTransformRepsonse<WithCallerId<MultipleQueriesQuery>>[];
};

export type NonAlgoliaDescription = Description<
  {
    items: any[];
  },
  'other'
>;

type RichNonAlgoliaDescription = WithTransformRepsonse<
  WithCallerId<{
    $$type: 'other';
    hits: any[];
  }>
>;

type WithCallerId<T> = T & { __autocomplete_callerId: string };

type WithTransformRepsonse<T> = T & {
  onFetched(response: any): any;
};

const transforms: Record<FetcherType, (response: any) => any> = {
  algoliaHits: (response: SearchResponse) => response.hits,
  algoliaResults: (response: SearchResponse) => response,
  other: (response: SearchResponse) => response.hits,
};

function toRichNonAlgoliaDescription({
  sourceId,
  results,
}: NonAlgoliaDescription): RichNonAlgoliaDescription {
  return {
    $$type: results.$$type,
    hits: results.items,
    onFetched: transforms[results.$$type],
    __autocomplete_callerId: sourceId,
  };
}

function toRichAlgoliaDescription({
  sourceId,
  results,
}: AlgoliaDescription): RichAlgoliaDescription {
  return {
    $$type: results.$$type,
    searchClient: results.searchClient,
    queries: results.queries.map((query) => {
      return {
        ...query,
        onFetched: transforms[results.$$type],
        __autocomplete_callerId: sourceId,
      };
    }),
  };
}

function isAlgoliaDescription(
  description: AlgoliaDescription | NonAlgoliaDescription
): description is AlgoliaDescription {
  return (
    description.results.$$type === 'algoliaHits' ||
    description.results.$$type === 'algoliaResults'
  );
}

function isRichAlgoliaDescription(
  description: RichAlgoliaDescription | RichNonAlgoliaDescription
): description is RichAlgoliaDescription {
  return (
    description.$$type === 'algoliaHits' ||
    description.$$type === 'algoliaResults'
  );
}

// @TODO: solve concurrency issues with request ID
export async function resolve(
  d: Promise<AlgoliaDescription | NonAlgoliaDescription>[]
) {
  const descriptions = await Promise.all(d);
  const richDescriptions = descriptions.map((description) => {
    if (isAlgoliaDescription(description)) {
      return toRichAlgoliaDescription(description);
    }

    return toRichNonAlgoliaDescription(description);
  });
  const groupedRichDescriptions = richDescriptions.reduce((acc, curr) => {
    if (isRichAlgoliaDescription(curr)) {
      const matchingGroup = acc.find((group) => {
        return isRichAlgoliaDescription(group)
          ? group.searchClient === curr.searchClient
          : undefined;
      }) as RichAlgoliaDescription | undefined;

      if (matchingGroup) {
        matchingGroup.queries = [...matchingGroup.queries, ...curr.queries];
      } else {
        acc.push(curr);
      }
    } else {
      acc.push(curr);
    }

    return acc;
  }, [] as (RichNonAlgoliaDescription | RichAlgoliaDescription)[]);
  const richResponses = groupedRichDescriptions.map((group) => {
    if (!isRichAlgoliaDescription(group)) {
      return [group];
    }

    const { searchClient, queries } = group;

    return getAlgoliaResults({
      searchClient,
      queries: stripNonAlgoliaParameters(queries),
    }).then((results) => {
      return reassignNonAlgoliaParameters(results, queries);
    });
  });

  return Promise.all(richResponses);
}

function stripNonAlgoliaParameters(
  queries: WithTransformRepsonse<WithCallerId<MultipleQueriesQuery>>[]
) {
  return queries.map((query) => {
    const { __autocomplete_callerId, onFetched, ...rest } = query;

    return rest;
  });
}

function reassignNonAlgoliaParameters(
  results: SearchResponse<unknown>[],
  reference: WithTransformRepsonse<WithCallerId<MultipleQueriesQuery>>[]
) {
  return results.map((result, index) => {
    const { __autocomplete_callerId, onFetched } = reference[index];

    return {
      ...result,
      __autocomplete_callerId,
      onFetched,
    };
  });
}
