import type {
  MultipleQueriesQuery,
  SearchResponse,
} from '@algolia/client-search';
import type { SearchClient } from 'algoliasearch';
import { getAlgoliaResults } from '../../autocomplete-js/src';

type FetcherType = 'algoliaHits' | 'algoliaResults'; // | 'algoliaFacetHits';

type FetcherDescription = {
  $$type?: FetcherType;
};

type NonAlgoliaDescription = {
  sourceId: string;
  results: any[];
};

type _FetcherDescription = {
  results: {
    $$type: FetcherType;
  } & AlgoliaQuery;
  sourceId: string;
};

type AlgoliaQuery = {
  searchClient: SearchClient;
  queries: MultipleQueriesQuery[];
};

type RichFetcherDescription = {
  type: 'pending';
  searchClient: SearchClient;
  queries: WithTransformRepsonse<WithCallerId<MultipleQueriesQuery>>[];
};

type WithCallerId<T> = T & { __autocomplete_callerId: string };

type WithTransformRepsonse<T> = T & {
  onFetched(response: any): any;
};

interface AlgoliaFetcherDescription extends FetcherDescription {
  searchClient: SearchClient;
  queries: MultipleQueriesQuery[];
}

const transforms: Record<FetcherType, (response: any) => any> = {
  algoliaHits: (response: SearchResponse) => response.hits,
  algoliaResults: (response: SearchResponse) => response,
};

function toResolved(n: NonAlgoliaDescription) {
  return {
    type: 'resolved',
    __autocomplete_callerId: n.sourceId,
    hits: n.results,
    onFetched: ({ hits }) => hits,
  };
}

function toRichFetcherDescription(
  description: _FetcherDescription
): RichFetcherDescription {
  return {
    type: 'pending',
    searchClient: description.results.searchClient,
    queries: description.results.queries.map((query) => {
      return {
        ...query,
        __autocomplete_callerId: description.sourceId,
        onFetched: transforms[description.results.$$type],
      };
    }),
  };
}

function isFetcherDescription(
  description: any
): description is FetcherDescription {
  return Boolean(description.$$type);
}

function isAlgoliaFetcherDescription(
  description: any
): description is AlgoliaFetcherDescription {
  return (
    description.$$type === 'algoliaHits' ||
    description.$$type === 'algoliaResults'
  );
}

// @TODO: solve concurrency issues with request ID
export async function resolve(descriptions: unknown[]) {
  const data = await Promise.all(descriptions);
  const data2 = data.map((d) => {
    if (!Array.isArray(d.results) && d.results.$$type) {
      return toRichFetcherDescription(d);
    }

    return toResolved(d);
  }).reduce((acc, curr) => {
    const needle = acc.find(x => x?.searchClient === curr.searchClient)

    if (needle) {
      needle.queries = [...needle.queries, ...curr.queries]
    } else {
      acc.push(curr);
    }

    return acc;
  }, []);

  const data3 = data2.map((group) => {
    if (group.type === 'resolved') {
      return [group];
    }

    const { searchClient, queries } = group;

    return getAlgoliaResults({
      searchClient,
      queries: stripNonAlgoliaStuff(queries),
    }).then((results) => {
      return reassignNonAlgoliaStuff(results, queries);
    });
  });

  return Promise.all(data3);
}

function stripNonAlgoliaStuff(queries) {
  return queries.map((query) => {
    const { __autocomplete_callerId, onFetched, ...rest } = query;

    return rest;
  });
}

function reassignNonAlgoliaStuff(results, reference) {
  return results.map((result, index) => {
    const { __autocomplete_callerId, onFetched, type } = reference[index];

    return {
      ...result,
      __autocomplete_callerId,
      onFetched,
      type,
    };
  });
}
