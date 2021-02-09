/** @jsx h */
import { autocomplete } from '@algolia/autocomplete-js';
import { createQuerySuggestionsPlugin } from '@algolia/autocomplete-plugin-query-suggestions';
import { createLocalStorageRecentSearchesPlugin } from '@algolia/autocomplete-plugin-recent-searches';
import algoliasearch from 'algoliasearch/lite';
import instantsearch from 'instantsearch.js';
import { connectSearchBox } from 'instantsearch.js/es/connectors';
import historyRouter from 'instantsearch.js/es/lib/routers/history';
import {
  hits,
  pagination,
  configure,
  hierarchicalMenu,
  panel,
} from 'instantsearch.js/es/widgets';
import Navigo from 'navigo';
import { h, Fragment } from 'preact';

import '@algolia/autocomplete-theme-classic';

const router = new Navigo('/');
const searchClient = algoliasearch(
  'latency',
  '6be0576ff61c053d5f9a3225e2a90f76'
);
const searchPageIndexName = 'instant_search';

const instantSearchRouter = historyRouter();

function getSearchPageUrl({ query, hierarchicalMenu }: any) {
  return `search${instantSearchRouter
    .createURL({
      [searchPageIndexName]: {
        query,
        hierarchicalMenu,
      },
    })
    .replace(window.location.origin, '')}`;
}

function isSearchPage() {
  return router.current?.[0].url === 'search';
}

const search = instantsearch({
  searchClient,
  indexName: searchPageIndexName,
  routing: instantSearchRouter,
});
const virtualSearchBox = connectSearchBox(() => {});
const hierarchicalMenuWithHeader = panel({
  templates: { header: 'Categories' },
})(hierarchicalMenu);

search.addWidgets([
  configure({
    attributesToSnippet: ['description:25'],
    snippetEllipsisText: '…',
  }),
  virtualSearchBox(),
  hierarchicalMenuWithHeader({
    container: '#categories',
    attributes: ['hierarchicalCategories.lvl0', 'hierarchicalCategories.lvl1'],
  }),
  hits({
    container: '#hits',
    templates: {
      item: `
        <article class="hit">
          <div class="hit-image">
            <img src="{{image}}" alt="{{name}}">
          </div>
          <div>
            <h1>
              {{#helpers.highlight}}{ "attribute": "name" }{{/helpers.highlight}}
            </h1>
            <p>
              {{#helpers.snippet}}{ "attribute": "description" }{{/helpers.snippet}}
            </p>
          </div>
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

function setInstantSearchQuery(query: string) {
  search.setUiState((uiState) => ({
    ...uiState,
    [searchPageIndexName]: {
      ...uiState[searchPageIndexName],
      query,
    },
  }));
}

const recentSearchesPlugin = createLocalStorageRecentSearchesPlugin({
  key: 'instantsearch-basic',
  limit: 3,
  transformSource({ source }) {
    return {
      ...source,
      getItemUrl({ item }) {
        return isSearchPage()
          ? undefined
          : getSearchPageUrl({
              query: item.query,
              hierarchicalMenu: {
                'hierarchicalCategories.lvl0': item.__autocomplete_qsCategories,
              },
            });
      },
      onSelect({ setIsOpen, item }) {
        setIsOpen(false);

        if (isSearchPage()) {
          setInstantSearchQuery(item.query);
        }
      },
      templates: {
        ...source.templates,
        item(params) {
          const { item } = params;

          if (isSearchPage()) {
            return source.templates.item(params);
          }

          return (
            <a
              href={getSearchPageUrl({
                query: item.query,
                hierarchicalMenu: {
                  'hierarchicalCategories.lvl0':
                    item.__autocomplete_qsCategories,
                },
              })}
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
  getSearchParams() {
    return recentSearchesPlugin.data.getAlgoliaSearchParams({
      hitsPerPage: 6,
    });
  },
  transformSource({ source }) {
    return {
      ...source,
      getItems(params) {
        return source.getItems(params).then(([hits]) => {
          const firstHit = hits[0];

          if (
            firstHit?.instant_search.facets.exact_matches[
              'hierarchicalCategories.lvl0'
            ][0]
          ) {
            const hitWithCategories = {
              ...firstHit,
              isCategoryHit: true,
              __autocomplete_qsCategories: firstHit.instant_search.facets.exact_matches[
                'hierarchicalCategories.lvl0'
              ].map((x) => x.value),
            };
            hits.splice(1, 0, hitWithCategories);
          }

          return hits;
        });
      },
      getItemUrl({ item }) {
        return isSearchPage()
          ? undefined
          : getSearchPageUrl({
              query: item.query,
              hierarchicalMenu: {
                'hierarchicalCategories.lvl0': item.__autocomplete_qsCategories,
              },
            });
      },
      onSelect({ setIsOpen, item }) {
        setIsOpen(false);

        if (isSearchPage()) {
          if (item.__autocomplete_qsCategories?.length > 0) {
            search.setUiState((uiState) => ({
              ...uiState,
              [searchPageIndexName]: {
                ...uiState[searchPageIndexName],
                hierarchicalMenu: {
                  'hierarchicalCategories.lvl0':
                    item.__autocomplete_qsCategories,
                },
              },
            }));
          } else {
            setInstantSearchQuery(item.query);
          }
        }
      },
      templates: {
        ...source.templates,
        item(params) {
          const { item } = params;
          const Wrapper = isSearchPage()
            ? Fragment
            : ({ children }) => (
                <a
                  href={getSearchPageUrl({
                    query: item.query,
                    hierarchicalMenu: {
                      'hierarchicalCategories.lvl0':
                        item.__autocomplete_qsCategories,
                    },
                  })}
                  className="aa-ItemLink"
                  data-navigo
                >
                  {children}
                </a>
              );

          return (
            <Wrapper>
              {item.__autocomplete_qsCategories ? (
                <Fragment>
                  <div className="aa-ItemIcon aa-ItemIcon--no-border"></div>
                  <div className="aa-ItemContent">
                    <div className="aa-ItemContentTitle">
                      in{' '}
                      <span style={{ color: 'var(--aa-icon-color)' }}>
                        {item.__autocomplete_qsCategories[0]}
                      </span>
                    </div>
                  </div>
                </Fragment>
              ) : (
                source.templates.item(params)
              )}
            </Wrapper>
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
      if (isSearchPage()) {
        setInstantSearchQuery(item.query);
      } else {
        router.navigate(itemUrl);
      }
    },
  },
  onSubmit({ state }) {
    if (isSearchPage()) {
      setInstantSearchQuery(state.query);
    } else {
      router.navigate(
        getSearchPageUrl({ query: state.query, hierarchicalMenu: {} })
      );
    }
  },
  onStateChange({ prevState, state }) {
    // overlay.hidden = !state.isOpen;

    if (isSearchPage()) {
      // if (!state.isOpen && prevState.query !== state.query) {
      setInstantSearchQuery(state.query);
      // }
    }
  },
  // debug: true,
});

router
  .on('/', () => {
    console.log('Home page');
    document.body.setAttribute('data-page', 'home');
  })
  .on(
    '/search',
    ({ params }) => {
      console.log('Search page', params);
      document.body.setAttribute('data-page', 'search');

      search.start();
      const query = params?.['instant_search[query]'];

      if (query) {
        autocompleteSearch.setQuery(query);
        setInstantSearchQuery(query);
      }
    },
    {
      leave() {
        search.dispose();
      },
    }
  )
  .resolve();
