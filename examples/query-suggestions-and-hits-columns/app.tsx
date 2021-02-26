/** @jsx h */
import {
  autocomplete,
  getAlgoliaHits,
  snippetHit,
} from '@algolia/autocomplete-js';
import { createQuerySuggestionsPlugin } from '@algolia/autocomplete-plugin-query-suggestions';
import { Hit } from '@algolia/client-search';
import algoliasearch from 'algoliasearch';
import { h, render } from 'preact';

import '@algolia/autocomplete-theme-classic';
type Product = {
  name: string;
  image: string;
  description: string;
  __autocomplete_indexName: string;
  __autocomplete_queryID: string;
};
type ProductHit = Hit<Product>;

const appId = 'latency';
const apiKey = '6be0576ff61c053d5f9a3225e2a90f76';
const searchClient = algoliasearch(appId, apiKey);

const querySuggestionsPlugin = createQuerySuggestionsPlugin({
  searchClient,
  indexName: 'instant_search_demo_query_suggestions',
  getSearchParams() {
    return {
      hitsPerPage: 6,
    };
  },
  transformSource({ source }) {
    return {
      ...source,
      onActive({ itemInputValue, setContext }) {
        setContext({ productQuery: itemInputValue });
      },
    };
  },
});

autocomplete({
  container: '#autocomplete',
  placeholder: 'Search',
  openOnFocus: true,
  plugins: [querySuggestionsPlugin],
  onStateChange({ prevState, state, refresh, setContext }) {
    if (state.query !== prevState.query) {
      setContext({ productQuery: '' });
    }
    if (prevState.context.productQuery !== state.context.productQuery) {
      refresh();
    }
  },
  getSources({ query, state }) {
    return [
      {
        sourceId: 'products',
        getItems() {
          return getAlgoliaHits<Product>({
            searchClient,
            queries: [
              {
                indexName: 'instant_search',
                query: state.context.productQuery || query,
                params: {
                  hitsPerPage: 3,
                  clickAnalytics: true,
                  attributesToSnippet: ['name:5'],
                  snippetEllipsisText: '…',
                },
              },
            ],
          });
        },
        templates: {
          item({ item }) {
            return <ProductItem hit={item} />;
          },
          noResults() {
            return (
              <div className="aa-ItemContent">No products for this query.</div>
            );
          },
        },
      },
    ];
  },
  debug: true,
  render({ sections }, root) {
    const [querySuggestions, products] = sections;

    render(
      <div
        className="aa-PanelLayout"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 3fr',
        }}
      >
        <div className="aa-Panel--Scrollable">{querySuggestions}</div>
        <div className="aa-Panel--Scrollable">{products}</div>
      </div>,
      root
    );
  },
});

type ProductItemProps = {
  hit: ProductHit;
};

function ProductItem({ hit }: ProductItemProps) {
  return (
    <div>
      <div className="aa-ItemIcon" style={{ margin: 'auto' }}>
        <img src={hit.image} alt={hit.name} width="150" height="150" />
      </div>
      <div className="aa-ItemContent">
        <div className="aa-ItemContentTitle">
          {snippetHit<ProductHit>({ hit, attribute: 'name' })}
        </div>
      </div>
    </div>
  );
}
