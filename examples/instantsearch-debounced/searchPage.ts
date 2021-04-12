/** @jsx h */
import instantsearch from 'instantsearch.js';
import { connectSearchBox } from 'instantsearch.js/es/connectors';
import historyRouter from 'instantsearch.js/es/lib/routers/history';
import {
  configure,
  hierarchicalMenu,
  hits,
  pagination,
  panel,
} from 'instantsearch.js/es/widgets';

import { searchClient } from './searchClient';

export const instantSearchIndexName = 'instant_search';
const instantSearchRouter = historyRouter();

export function getSearchPageUrl(indexUiState: any) {
  return `/search${instantSearchRouter
    .createURL({
      [instantSearchIndexName]: indexUiState,
    })
    .replace(window.location.origin + window.location.pathname, '')}`;
}
export function getSearchPageState() {
  return instantSearchRouter.read()?.[instantSearchIndexName] || {};
}

export const search = instantsearch({
  searchClient,
  indexName: instantSearchIndexName,
  routing: instantSearchRouter,
});
const virtualSearchBox = connectSearchBox(() => {});
const hierarchicalMenuWithHeader = panel({
  templates: { header: 'Categories' },
})(hierarchicalMenu);

search.addWidgets([
  configure({
    attributesToSnippet: ['name:7', 'description:15'],
    snippetEllipsisText: '…',
  }),
  // We mount a virtual search box to manipulate InstantSearch's `query` UI
  // state parameter.
  virtualSearchBox(),
  hierarchicalMenuWithHeader({
    container: '#categories',
    attributes: ['hierarchicalCategories.lvl0', 'hierarchicalCategories.lvl1'],
  }),
  hits({
    container: '#hits',
    transformItems(items) {
      return items.map((item) => ({
        ...item,
        category: item.categories[0],
        comments: (item.popularity % 100).toLocaleString(),
        sale: item.free_shipping,
        // eslint-disable-next-line @typescript-eslint/camelcase
        sale_price: item.free_shipping
          ? (item.price - item.price / 10).toFixed(2)
          : item.price,
      }));
    },
    templates: {
      item: `
        <article class="hit">
          <div class="hit-image">
            <img src="{{image}}" alt="{{name}}">
          </div>
          <div>
            <h1>
              {{#helpers.snippet}}{ "attribute": "name" }{{/helpers.snippet}}
            </h1>
            <div>
              By <strong>{{brand}}</strong> in <strong>{{category}}</strong>
            </div>
          </div>

          <div
            style="
              display: grid;
              grid-auto-flow: column;
              justify-content: start;
              align-items: center;
              gap: 8px;
            "
          >
            {{#rating}}
              <div
                style="
                  display: grid;
                  grid-auto-flow: column;
                  justify-content: start;
                  align-items: center;
                  gap: 4px;
                "
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="#e2a400"
                  stroke="#e2a400"
                  stroke-width="1"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {{rating}}
              </div>
            {{/rating}}

            <div
              style="
                display: grid;
                grid-auto-flow: column;
                justify-content: start;
                align-items: center;
                gap: 4px;
              "
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="
                  position: relative;
                  top: 1px;
                "
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>{{comments}}</span>
            </div>
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

export function setInstantSearchUiState(indexUiState: any) {
  search.setUiState((uiState) => ({
    ...uiState,
    [instantSearchIndexName]: {
      ...uiState[instantSearchIndexName],
      ...indexUiState,
    },
  }));
}
