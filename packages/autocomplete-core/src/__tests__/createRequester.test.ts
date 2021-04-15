import {
  createMultiSearchResponse,
  createSearchClient,
} from '../../../../test/utils';
import { fetchAlgoliaResults } from '../../../autocomplete-preset-algolia';
import { createRequester } from '../createRequester';

describe('createRequester', () => {
  test('returns a description', async () => {
    const searchClient = createSearchClient({
      search: jest.fn(() =>
        Promise.resolve(
          createMultiSearchResponse<{ label: string }>(
            { hits: [{ objectID: '1', label: 'Hit 1' }] },
            { hits: [{ objectID: '2', label: 'Hit 2' }] }
          )
        )
      ),
    });

    const transformResponse = ({ hits }) => hits;

    const createAlgoliaRequester = createRequester(fetchAlgoliaResults);
    const getAlgoliaResults = createAlgoliaRequester({ transformResponse });

    const description = await getAlgoliaResults({
      searchClient,
      queries: [
        {
          indexName: 'indexName',
          query: 'query',
        },
        {
          indexName: 'indexName2',
          query: 'query',
        },
      ],
    });

    expect(description).toEqual({
      fetcher: expect.any(Function),
      transformResponse,
      searchClient,
      queries: [
        {
          indexName: 'indexName',
          query: 'query',
        },
        {
          indexName: 'indexName2',
          query: 'query',
        },
      ],
    });
  });
});
