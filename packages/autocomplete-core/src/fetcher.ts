import type { MultipleQueriesQuery } from '@algolia/client-search';
import type { SearchClient } from 'algoliasearch';
import { getAlgoliaResults } from '../../autocomplete-js/src';

type FetcherType = 'algoliaHits' | 'algoliaResults'; // | 'algoliaFacetHits';

type FetcherDescription = {
  $$type?: FetcherType;
};

interface AlgoliaFetcherDescription extends FetcherDescription {
  searchClient: SearchClient;
  queries: MultipleQueriesQuery[];
}

type PackedDescription = {
  // $$type: FetcherType;
  queries: Array<{
    callerId: number;
    query: MultipleQueriesQuery;
  }>;
  transformResponse<TResponse>(response: TResponse): TResponse;
};

type FetcherDescriptionWrapper = {
  searchClient: SearchClient;
  descriptions: PackedDescription[];
};

const identity = (x) => x;

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
  console.log('pack', descriptions);

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
  console.group('resolve');
  console.log('descriptions', descriptions);

  const packedDescriptions = pack(await Promise.all(descriptions));
  console.log('packedDescriptions', packedDescriptions);

  const responses = await request(packedDescriptions);
  console.log('responses', responses);

  // const unpackedDescriptions = unpack(responses);
  // console.log('unpackedDescriptions', unpackedDescriptions);

  console.groupEnd();

  return responses;
}
