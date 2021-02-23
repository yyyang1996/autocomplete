/** @jsx h */
import { autocomplete, AutocompleteSource } from '@algolia/autocomplete-js';
import { createQuerySuggestionsPlugin } from '@algolia/autocomplete-plugin-query-suggestions';
import { createLocalStorageRecentSearchesPlugin } from '@algolia/autocomplete-plugin-recent-searches';
import Navigo from 'navigo';
import { h } from 'preact';

import '@algolia/autocomplete-theme-classic';

import { debounce } from './debounce';
import { searchClient } from './searchClient';
import {
  getSearchPageState,
  getSearchPageUrl,
  search,
  setInstantSearchUiState,
} from './searchPage';

const router = new Navigo('/');

function isSearchPage() {
  return document.body.getAttribute('data-active-page') === 'search';
}

function transformSource<TItem extends Record<string, unknown>>({
  source,
}: {
  source: AutocompleteSource<TItem>;
}) {
  return {
    ...source,
    getItemUrl({ item }) {
      if (isSearchPage()) {
        return undefined;
      }

      return getSearchPageUrl({
        query: item.query,
        hierarchicalMenu: {
          'hierarchicalCategories.lvl0': [item.__autocomplete_qsCategory],
        },
      });
    },
    onSelect({ setIsOpen, item }) {
      setIsOpen(false);

      if (isSearchPage()) {
        if (item.__autocomplete_qsCategory) {
          setInstantSearchUiState({
            query: item.query,
            hierarchicalMenu: {
              'hierarchicalCategories.lvl0': [item.__autocomplete_qsCategory],
            },
          });
        } else {
          setInstantSearchUiState({ query: item.query });
        }
      }
    },
    templates: {
      ...source.templates,
      item(params) {
        const { item } = params;

        return (
          <a
            className="aa-ItemLink"
            href={getSearchPageUrl({
              query: item.query,
              hierarchicalMenu: {
                'hierarchicalCategories.lvl0': [item.__autocomplete_qsCategory],
              },
            })}
            onClick={(event) => {
              if (isSearchPage()) {
                event.preventDefault();
              }
            }}
          >
            {source.templates.item(params)}
          </a>
        );
      },
    },
  };
}

const recentSearchesPlugin = createLocalStorageRecentSearchesPlugin({
  key: 'instantsearch-basic',
  limit: 3,
  transformSource,
});
const querySuggestionsPlugin = createQuerySuggestionsPlugin({
  searchClient,
  indexName: 'instant_search_demo_query_suggestions',
  getSearchParams() {
    return recentSearchesPlugin.data.getAlgoliaSearchParams({
      hitsPerPage: 6,
    });
  },
  categoryAttribute: 'hierarchicalCategories.lvl0',
  transformSource,
});

const debouncedSetInstantSearchUiState = debounce(setInstantSearchUiState, 500);

const autocompleteSearch = autocomplete({
  container: '#autocomplete',
  openOnFocus: true,
  plugins: [recentSearchesPlugin, querySuggestionsPlugin],
  touchMediaQuery: 'none',
  // debug: true,
  navigator: {
    navigate({ item }) {
      router.navigate(
        getSearchPageUrl({
          query: item.query,
          hierarchicalMenu: {
            'hierarchicalCategories.lvl0': [item.__autocomplete_qsCategory],
          },
        })
      );
    },
  },
  onSubmit({ state }) {
    if (isSearchPage()) {
      setInstantSearchUiState({ query: state.query });
    } else {
      router.navigate(getSearchPageUrl({ query: state.query }));
    }
  },
  onStateChange({ state }) {
    if (isSearchPage()) {
      debouncedSetInstantSearchUiState({ query: state.query });
    }
  },
});

router
  .on('/', () => {
    document.body.setAttribute('data-active-page', 'home');
  })
  .on(
    '/search',
    () => {
      document.body.setAttribute('data-active-page', 'search');

      search.start();
      const searchPageState = getSearchPageState();

      if (searchPageState.query) {
        autocompleteSearch.setQuery(searchPageState.query);
      }
      setInstantSearchUiState(searchPageState);
    },
    {
      leave() {
        search.dispose();
      },
    }
  )
  .resolve();
