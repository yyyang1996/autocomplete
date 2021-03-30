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

type RichFetcherResponse<T> = WithTransformRepsonse<
  WithCallerId<SearchResponse>
>;

type WithCallerId<T> = T & { __autocomplete_callerId: string };

type WithTransformRepsonse<T> = T & {
  onFetched(response: any): any;
};

interface AlgoliaFetcherDescription extends FetcherDescription {
  searchClient: SearchClient;
  queries: MultipleQueriesQuery[];
}

interface FetcherDescriptionWrapper extends FetcherDescription {
  searchClient: SearchClient;
  descriptions: WithTransformRepsonse<WithCallerId<MultipleQueriesQuery>[]>[];
}

const identity = (x) => x;

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

function pack(descriptions: unknown[]): FetcherDescriptionWrapper[] {
  return descriptions.reduce<FetcherDescriptionWrapper[]>(
    (acc, current, index) => {
      if (isAlgoliaFetcherDescription(current)) {
        const descriptionWrapper = acc.find(
          (description) => current.searchClient === description.searchClient
        );

        if (descriptionWrapper) {
          descriptionWrapper.descriptions.push({
            queries: current.queries.map((query) => ({
              callerId: index,
              query,
            })),
            transformResponse:
              current.$$type === 'algoliaHits' ? (x) => x.hits : identity,
          });
        } else {
          acc.push({
            searchClient: current.searchClient,
            descriptions: [
              {
                queries: current.queries.map((query) => ({
                  callerId: index,
                  query,
                })),
                transformResponse:
                  current.$$type === 'algoliaHits' ? (x) => x.hits : identity,
              },
            ],
          });
        }
      } else {
        acc.push(current); // @TODO: have description format
      }

      return acc;
    },
    []
  );
}

const callerIdRegex = /__autocomplete_callerId:(\d+)/;

function request(wrappers: FetcherDescriptionWrapper[]) {
  const res = Promise.resolve(
    wrappers.map((wrapper) => {
      if (!wrapper.searchClient) {
        return wrapper;
      }

      return getAlgoliaResults({
        searchClient: wrapper.searchClient,
        queries: wrapper.descriptions.flatMap((description) =>
          description.queries.map((x) => ({
            ...x.query,
            params: {
              ...x.query.params,
              ruleContexts: [
                `__autocomplete_callerId:${x.callerId}`,
                ...(x.query.params.ruleContexts || []),
              ],
            },
          }))
        ),
      }).then((responses) => {
        return responses.reduce((acc, response, index) => {
          const match = decodeURIComponent(response.params).match(
            callerIdRegex
          );

          if (match === null) {
            return acc;
          }

          const callerId = `__autocomplete_callerId:${match[1]}`;
          const transformedResponse = response.hits;
          // wrapper.descriptions[
          //   index
          // ].transformResponse(response);

          if (acc[callerId]) {
            acc[callerId].push(transformedResponse);
          } else {
            acc[callerId] = [transformedResponse];
          }

          return acc;
        }, {});
      });
    })[0]
  );

  return res.then((r) => {
    return Object.values(r);
  });
}

// function unpack(responses: Array<Record<number, any[][]>>) {
//   console.log('unpack', responses);

//   const mappedResponses = responses.flatMap((response) => {
//     return response.reduce((acc, response) => {
//       const match = decodeURIComponent(response.params).match(callerIdRegex);

//       if (match === null) {
//         return acc;
//       }

//       const callerId = match[1];
//       // const callerId = Number(match[1]);

//       if (acc[callerId]) {
//         acc[callerId].push(response);
//       } else {
//         acc[callerId] = [response];
//       }

//       return acc;
//     }, {});
//   });

//   console.log({ mappedResponses });

//   const results = Object.entries(mappedResponses);

//   console.log({ results });

//   return results;
// }

// @TODO: solve concurrency issues with request ID
export async function resolve(descriptions: unknown[]) {
  const data = await Promise.all(descriptions);
  const data2 = data.map((d) => {
    if (!Array.isArray(d.results) && d.results.$$type) {
      return toRichFetcherDescription(d);
    }

    return toResolved(d);
  });

  console.log({ data });
  console.log({ data2 });

  const data3 = data2.map((group) => {
    if (group.type === 'resolved') {
      return [group];
    }

    const { searchClient, queries } = group;

    return getAlgoliaResults({
      searchClient,
      queries: stripNonAlgoliaStuff(queries),
    }).then((results) => {
      return reassignNonAlgoliaSTuff(results, queries);
    });
  });

  /* const packedDescriptions = pack(await Promise.all(descriptions));

  const responses = await request(packedDescriptions); */

  // const unpackedDescriptions = unpack(responses);
  // console.log('unpackedDescriptions', unpackedDescriptions);

  //return responses;

  return Promise.all(data3);
}

function stripNonAlgoliaStuff(queries) {
  return queries.map((query) => {
    const { __autocomplete_callerId, onFetched, ...rest } = query;

    return rest;
  });
}

function reassignNonAlgoliaSTuff(results, reference) {
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
