/** @jsx h */
import { autocomplete } from '@algolia/autocomplete-js';
import { createQuerySuggestionsPlugin } from '@algolia/autocomplete-plugin-query-suggestions';
import { createLocalStorageRecentSearchesPlugin } from '@algolia/autocomplete-plugin-recent-searches';
import Navigo from 'navigo';
import { h, Fragment } from 'preact';

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
const hierarchicalAttribute = 'hierarchicalCategories.lvl0';

function isSearchPage() {
  return document.body.getAttribute('data-active-page') === 'search';
}

function getActiveCategory() {
  return search.renderState.instant_search?.hierarchicalMenu?.[
    hierarchicalAttribute
  ].items.find((item) => item.isRefined)?.value;
}

function getItemUrl({ item }) {
  if (isSearchPage()) {
    return undefined;
  }

  return getSearchPageUrl({
    query: item.query,
    hierarchicalMenu: {
      [hierarchicalAttribute]: [item.__autocomplete_qsCategory],
    },
  });
}

function onSelect({ setIsOpen, item }) {
  setIsOpen(false);

  if (isSearchPage()) {
    if (item.__autocomplete_qsCategory) {
      setInstantSearchUiState({
        query: item.query,
        hierarchicalMenu: {
          [hierarchicalAttribute]: [item.__autocomplete_qsCategory],
        },
      });
    } else {
      setInstantSearchUiState({
        query: item.query,
      });
    }
  }
}

function ItemWrapper({ item, children }) {
  return (
    <a
      className="aa-ItemLink"
      href={getSearchPageUrl({
        query: item.query,
        hierarchicalMenu: {
          [hierarchicalAttribute]: [item.__autocomplete_qsCategory],
        },
      })}
      onClick={(event) => {
        if (isSearchPage()) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </a>
  );
}

const recentSearchesPlugin = createLocalStorageRecentSearchesPlugin({
  key: 'instantsearch-basic',
  limit: 3,
  transformSource({ source }) {
    return {
      ...source,
      getItemUrl,
      onSelect,
      templates: {
        ...source.templates,
        item(params) {
          return (
            <ItemWrapper item={params.item}>
              {source.templates.item(params)}
            </ItemWrapper>
          );
        },
      },
    };
  },
});
const querySuggestionsPluginInCategory = createQuerySuggestionsPlugin({
  searchClient,
  indexName: 'instant_search_demo_query_suggestions',
  getSearchParams() {
    const activeCategory = getActiveCategory();

    return recentSearchesPlugin.data.getAlgoliaSearchParams({
      hitsPerPage: 3,
      facets: ['facets.exact_matches.categories'],
      facetFilters: [
        `instant_search.facets.exact_matches.categories.value:${activeCategory}`,
      ],
    });
  },
  transformSource({ source }) {
    const activeCategory = getActiveCategory();

    return {
      ...source,
      getItemUrl,
      onSelect,
      getItems(params) {
        if (!activeCategory) {
          return [];
        }

        return source.getItems(params);
      },
      templates: {
        ...source.templates,
        header({ items }) {
          if (items.length === 0) {
            return null;
          }

          return (
            <Fragment>
              <span className="aa-SourceHeaderTitle">In {activeCategory}</span>
              <div className="aa-SourceHeaderLine" />
            </Fragment>
          );
        },
        item(params) {
          return (
            <ItemWrapper item={params.item}>
              {source.templates.item(params)}
            </ItemWrapper>
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
    const activeCategory = getActiveCategory();

    return recentSearchesPlugin.data.getAlgoliaSearchParams({
      hitsPerPage: activeCategory ? 3 : 6,
      facets: ['facets.exact_matches.categories'],
      facetFilters: [
        `instant_search.facets.exact_matches.categories.value:-${activeCategory}`,
      ],
    });
  },
  categoryAttribute: [
    'instant_search',
    'facets',
    'exact_matches',
    hierarchicalAttribute,
  ],
  transformSource({ source }) {
    const activeCategory = getActiveCategory();

    return {
      ...source,
      getItemUrl,
      onSelect({ setIsOpen, item }) {
        setIsOpen(false);

        if (isSearchPage()) {
          if (item.__autocomplete_qsCategory) {
            setInstantSearchUiState({
              query: item.query,
              hierarchicalMenu: {
                [hierarchicalAttribute]: [item.__autocomplete_qsCategory],
              },
            });
          } else {
            setInstantSearchUiState({
              query: item.query,
              hierarchicalMenu: {
                [hierarchicalAttribute]: [],
              },
            });
          }
        }
      },
      getItems(params) {
        if (!params.state.query && activeCategory) {
          return [];
        }

        return source.getItems(params);
      },
      templates: {
        ...source.templates,
        header({ items }) {
          if (!activeCategory || items.length === 0) {
            return null;
          }

          return (
            <Fragment>
              <span className="aa-SourceHeaderTitle">In other categories</span>
              <div className="aa-SourceHeaderLine" />
            </Fragment>
          );
        },
        item(params) {
          return (
            <ItemWrapper item={params.item}>
              {source.templates.item(params)}
            </ItemWrapper>
          );
        },
      },
    };
  },
});

const debouncedSetInstantSearchUiState = debounce(setInstantSearchUiState, 500);

const autocompleteSearch = autocomplete({
  container: '#autocomplete',
  openOnFocus: true,
  plugins: [
    recentSearchesPlugin,
    querySuggestionsPluginInCategory,
    querySuggestionsPlugin,
  ],
  touchMediaQuery: 'none',
  debug: process.env.NODE_ENV === 'development',
  navigator: {
    navigate({ item }) {
      router.navigate(
        getSearchPageUrl({
          query: item.query,
          hierarchicalMenu: {
            [hierarchicalAttribute]: [item.__autocomplete_qsCategory],
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
  onReset() {
    if (isSearchPage()) {
      setInstantSearchUiState({ query: '' });
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
