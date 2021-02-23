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
    attributesToSnippet: ['description:25'],
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

export function setInstantSearchUiState(indexUiState: any) {
  search.setUiState((uiState) => ({
    ...uiState,
    [instantSearchIndexName]: {
      ...uiState[instantSearchIndexName],
      ...indexUiState,
    },
  }));
}
