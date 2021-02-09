/** @jsx h */
import { autocomplete } from '@algolia/autocomplete-js';
import { createQuerySuggestionsPlugin } from '@algolia/autocomplete-plugin-query-suggestions';
import { createLocalStorageRecentSearchesPlugin } from '@algolia/autocomplete-plugin-recent-searches';
import algoliasearch from 'algoliasearch/lite';
import instantsearch from 'instantsearch.js';
import { connectSearchBox } from 'instantsearch.js/es/connectors';
import { hits, pagination } from 'instantsearch.js/es/widgets';
import Navigo from 'navigo';
import { h } from 'preact';

import '@algolia/autocomplete-theme-classic';

const router = new Navigo('/');
// global.router = router;

const searchClient = algoliasearch(
  'latency',
  '6be0576ff61c053d5f9a3225e2a90f76'
);

const searchPageIndex = 'instant_search';

function getSearchPageUrl(query: string) {
  // return `search?${searchPageIndex}[query]=${query}`;

  return `search?q=${query}`;
}

const search = instantsearch({
  searchClient,
  indexName: searchPageIndex,
  // routing: true,
});
const virtualSearchBox = connectSearchBox(() => {});

search.addWidgets([
  virtualSearchBox(),
  hits({
    container: '#hits',
    templates: {
      item: `
        <article>
          <h1>
            {{#helpers.highlight}}{ "attribute": "name" }{{/helpers.highlight}}
          </h1>
          <p>
            {{#helpers.highlight}}{ "attribute": "description" }{{/helpers.highlight}}
          </p>
        </article>
      `,
    },
  }),
  pagination({
    container: '#pagination',
    padding: 2,
    showFirst: false,
    showLast: false,
  }),
]);

const recentSearchesPlugin = createLocalStorageRecentSearchesPlugin({
  key: 'instantsearch-basic',
  limit: 3,
  transformSource({ source }) {
    return {
      ...source,
      getItemUrl({ item }) {
        return router.current[0].url === 'search'
          ? undefined
          : getSearchPageUrl(item.query);
      },
      onSelect({ setIsOpen, item }) {
        setIsOpen(false);

        if (router.current[0].url === 'search') {
          search.setUiState({
            [searchPageIndex]: {
              query: item.query,
            },
          });
        }
      },
      templates: {
        ...source.templates,
        item(params) {
          const { item } = params;

          if (router.current[0].url === 'search') {
            return source.templates.item(params);
          }

          return (
            <a
              href={getSearchPageUrl(item.query)}
              className="aa-ItemLink"
              data-navigo
            >
              {source.templates.item(params)}
            </a>
          );
        },
      },
    };
  },
});
const querySuggestionsPlugin = createQuerySuggestionsPlugin({
  searchClient,
  indexName: 'instant_search_demo_query_suggestions',
  transformSource({ source }) {
    return {
      ...source,
      getItemUrl({ item }) {
        return router.current[0].url === 'search'
          ? undefined
          : getSearchPageUrl(item.query);
      },
      onSelect({ setIsOpen, item }) {
        setIsOpen(false);

        if (router.current[0].url === 'search') {
          search.setUiState({
            [searchPageIndex]: {
              query: item.query,
            },
          });
        }
      },
      templates: {
        ...source.templates,
        item(params) {
          const { item } = params;

          if (router.current[0].url === 'search') {
            return source.templates.item(params);
          }

          return (
            <a
              href={getSearchPageUrl(item.query)}
              className="aa-ItemLink"
              data-navigo
            >
              {source.templates.item(params)}
            </a>
          );
        },
      },
    };
  },
});

const overlay = document.createElement('div');
overlay.className = 'aa-Overlay';
overlay.hidden = true;
document.body.prepend(overlay);

const autocompleteSearch = autocomplete({
  container: '#autocomplete',
  placeholder: 'Search',
  openOnFocus: true,
  plugins: [recentSearchesPlugin, querySuggestionsPlugin],
  touchMediaQuery: 'none',
  navigator: {
    navigate({ itemUrl, item }) {
      if (router.current[0].url === 'search') {
        search.setUiState({
          [searchPageIndex]: {
            query: item.query,
          },
        });
      } else {
        router.navigate(itemUrl);
      }
    },
  },
  onSubmit({ state }) {
    if (router.current[0].url === 'search') {
      search.setUiState({
        [searchPageIndex]: {
          query: state.query,
        },
      });
    } else {
      router.navigate(getSearchPageUrl(state.query));
    }
  },
  onStateChange({ state }) {
    overlay.hidden = !state.isOpen;
  },
  debug: true,
});

router
  .on('/', () => {
    console.log('Home page');
  })
  .on(
    '/search',
    ({ params }) => {
      console.log('Search page', params);

      search.start();

      const query = params.q;

      if (query) {
        autocompleteSearch.setQuery(query);

        search.setUiState({
          [searchPageIndex]: {
            query,
          },
        });
      }
    },
    {
      leave() {
        search.dispose();
      },
    }
  )
  .resolve();
