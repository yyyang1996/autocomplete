/** @jsx h */
import {
  autocomplete,
  // getAlgoliaHits,
  snippetHit,
  reverseHighlightHit,
} from '@algolia/autocomplete-js';
import algoliasearch from 'algoliasearch';
import { h, Fragment } from 'preact';

import '@algolia/autocomplete-theme-classic';

import { ProductHit } from './types';

const appId = 'latency';
const apiKey = '6be0576ff61c053d5f9a3225e2a90f76';
const searchClient = algoliasearch(appId, apiKey);

// From library:
function getAlgoliaHits({ searchClient, queries }) {
  return {
    $$type: 'algoliaHits',
    searchClient,
    queries,
  };
}

autocomplete({
  container: '#autocomplete',
  placeholder: 'Search',
  debug: true,
  openOnFocus: true,
  plugins: [
    // shortcutsPlugin,
    // algoliaInsightsPlugin,
    // recentSearchesPlugin,
    // querySuggestionsPlugin,
    // categoriesPlugin,
  ],
  getSources({ query, state }) {
    if (!query) {
      return [];
    }

    return [
      // {
      //   sourceId: 'github',
      //   getItems() {
      //     return fetch(`https://api.github.com/search/repositories?q=${query}`)
      //       .then((res) => res.json())
      //       .then((r) => r.items || []);
      //   },
      //   templates: {
      //     item({ item }) {
      //       return item.full_name;
      //     },
      //   },
      // },
      {
        sourceId: 'suggestions',
        getItems() {
          return getAlgoliaHits({
            searchClient,
            queries: [
              {
                indexName: 'instant_search_demo_query_suggestions',
                query,
                params: {
                  clickAnalytics: true,
                },
              },
              {
                indexName: 'instant_search_demo_query_suggestions',
                query,
                params: {
                  clickAnalytics: true,
                },
              },
            ],
          });
        },
        templates: {
          header() {
            return (
              <Fragment>
                <span className="aa-SourceHeaderTitle">Suggestions</span>
                <div className="aa-SourceHeaderLine" />
              </Fragment>
            );
          },
          item({ item }) {
            return <QuerySuggestionItem hit={item} />;
          },
        },
      },
      {
        sourceId: 'products',
        getItems() {
          return getAlgoliaHits({
            searchClient,
            queries: [
              {
                indexName: 'instant_search',
                query,
                params: {
                  clickAnalytics: true,
                  attributesToSnippet: ['name:10', 'description:35'],
                  snippetEllipsisText: '…',
                },
              },
            ],
          });
        },
        templates: {
          header() {
            return (
              <Fragment>
                <span className="aa-SourceHeaderTitle">Products</span>
                <div className="aa-SourceHeaderLine" />
              </Fragment>
            );
          },
          item({ item }) {
            return (
              <ProductItem
                hit={item}
                // insights={state.context.algoliaInsightsPlugin.insights}
              />
            );
          },
        },
      },
    ];
  },
});

function QuerySuggestionItem({ hit }) {
  return (
    <Fragment>
      <div className="aa-ItemIcon aa-ItemIcon--no-border">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M16.041 15.856c-0.034 0.026-0.067 0.055-0.099 0.087s-0.060 0.064-0.087 0.099c-1.258 1.213-2.969 1.958-4.855 1.958-1.933 0-3.682-0.782-4.95-2.050s-2.050-3.017-2.050-4.95 0.782-3.682 2.050-4.95 3.017-2.050 4.95-2.050 3.682 0.782 4.95 2.050 2.050 3.017 2.050 4.95c0 1.886-0.745 3.597-1.959 4.856zM21.707 20.293l-3.675-3.675c1.231-1.54 1.968-3.493 1.968-5.618 0-2.485-1.008-4.736-2.636-6.364s-3.879-2.636-6.364-2.636-4.736 1.008-6.364 2.636-2.636 3.879-2.636 6.364 1.008 4.736 2.636 6.364 3.879 2.636 6.364 2.636c2.125 0 4.078-0.737 5.618-1.968l3.675 3.675c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414z" />
        </svg>
      </div>

      <div className="aa-ItemContent">
        <div className="aa-ItemContentTitle">
          {reverseHighlightHit({
            hit,
            attribute: 'query',
          })}
        </div>
      </div>

      <div className="aa-ItemActions">
        <button
          className="aa-ItemActionButton"
          title={`Fill query with "${hit.query}"`}
          onClick={(event) => {
            event.stopPropagation();
            // onTapAhead(hit);
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M8 17v-7.586l8.293 8.293c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414l-8.293-8.293h7.586c0.552 0 1-0.448 1-1s-0.448-1-1-1h-10c-0.552 0-1 0.448-1 1v10c0 0.552 0.448 1 1 1s1-0.448 1-1z" />
          </svg>
        </button>
      </div>
    </Fragment>
  );
}

type ProductItemProps = {
  hit: ProductHit;
};

function ProductItem({ hit }: ProductItemProps) {
  return (
    <Fragment>
      <div className="aa-ItemIcon aa-ItemIcon--align-top">
        <img src={hit.image} alt={hit.name} width="40" height="40" />
      </div>
      <div className="aa-ItemContent">
        <div className="aa-ItemContentTitle">
          {snippetHit<ProductHit>({ hit, attribute: 'name' })}
        </div>
        <div className="aa-ItemContentDescription">
          {snippetHit<ProductHit>({ hit, attribute: 'description' })}
        </div>
      </div>
      <div className="aa-ItemActions">
        <button
          className="aa-ItemActionButton aa-TouchOnly aa-ActiveOnly"
          type="button"
          title="Select"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M18.984 6.984h2.016v6h-15.188l3.609 3.609-1.406 1.406-6-6 6-6 1.406 1.406-3.609 3.609h13.172v-4.031z" />
          </svg>
        </button>
      </div>
    </Fragment>
  );
}
