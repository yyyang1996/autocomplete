import {
  AutocompleteScopeApi,
  AutocompleteOptions as AutocompleteCoreOptions,
  BaseItem,
  GetSourcesParams,
} from '@algolia/autocomplete-core';
import { MaybePromise } from '@algolia/autocomplete-shared';

import { AutocompleteClassNames } from './AutocompleteClassNames';
import { PublicAutocompleteComponents } from './AutocompleteComponents';
import { AutocompletePlugin } from './AutocompletePlugin';
import { AutocompletePropGetters } from './AutocompletePropGetters';
import { AutocompleteRender } from './AutocompleteRender';
import { AutocompleteRenderer } from './AutocompleteRenderer';
import { AutocompleteSource } from './AutocompleteSource';
import { AutocompleteState } from './AutocompleteState';

export interface OnStateChangeProps<TItem extends BaseItem>
  extends AutocompleteScopeApi<TItem> {
  /**
   * The current Autocomplete state.
   */
  state: AutocompleteState<TItem>;
  /**
   * The previous Autocomplete state.
   */
  prevState: AutocompleteState<TItem>;
}

export interface AutocompleteOptions<TItem extends BaseItem>
  extends AutocompleteCoreOptions<TItem>,
    Partial<AutocompletePropGetters<TItem>> {
  /**
   * The container for the Autocomplete search box.
   *
   * You can either pass a [CSS selector](https://developer.mozilla.org/docs/Web/CSS/CSS_Selectors) or an [Element](https://developer.mozilla.org/docs/Web/API/HTMLElement). If there are several containers matching the selector, Autocomplete picks up the first one.
   *
   * @link https://autocomplete.algolia.com/docs/autocomplete-js#container
   */
  container: string | HTMLElement;
  /**
   * The container for the Autocomplete panel.
   *
   * You can either pass a [CSS selector](https://developer.mozilla.org/docs/Web/CSS/CSS_Selectors) or an [Element](https://developer.mozilla.org/docs/Web/API/HTMLElement). If there are several containers matching the selector, Autocomplete picks up the first one.
   *
   * @default document.body
   * @link https://autocomplete.algolia.com/docs/autocomplete-js#panelcontainer
   */
  panelContainer?: string | HTMLElement;
  /**
   * The Media Query to turn Autocomplete into a detached experience.
   *
   * @default "(max-width: 680px)"
   * @link https://autocomplete.algolia.com/docs/autocomplete-js#detachedmediaquery
   * @link https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries
   */
  detachedMediaQuery?: string;
  getSources?: (
    params: GetSourcesParams<TItem>
  ) => MaybePromise<Array<AutocompleteSource<TItem>>>;
  /**
   * The panel's horizontal position.
   *
   * @default "input-wrapper-width"
   * @link https://autocomplete.algolia.com/docs/autocomplete-js#panelplacement
   */
  panelPlacement?: 'start' | 'end' | 'full-width' | 'input-wrapper-width';
  /**
   * Class names to inject for each created DOM element.
   *
   * This is useful to style your autocomplete with external CSS frameworks.
   *
   * @link https://autocomplete.algolia.com/docs/autocomplete-js#classnames
   */
  classNames?: Partial<AutocompleteClassNames>;
  /**
   * The function that renders the autocomplete panel.
   *
   * This is useful to customize the rendering, for example, using multi-row or multi-column layouts.
   *
   * @link https://autocomplete.algolia.com/docs/autocomplete-js#render
   */
  render?: AutocompleteRender<TItem>;
  /**
   * The function that renders a no results section when there are no hits.
   *
   * This is useful to let the user know that the query returned no results.
   *
   * @link https://autocomplete.algolia.com/docs/autocomplete-js#rendernoresults
   */
  renderNoResults?: AutocompleteRender<TItem>;
  initialState?: Partial<AutocompleteState<TItem>>;
  onStateChange?(props: OnStateChangeProps<TItem>): void;
  /**
   * The virtual DOM implementation to plug to Autocomplete. It defaults to Preact.
   *
   * @link https://autocomplete.algolia.com/docs/autocomplete-js#renderer
   */
  renderer?: AutocompleteRenderer;
  plugins?: Array<AutocompletePlugin<TItem, unknown>>;
  /**
   * Components to register in the Autocomplete rendering lifecycles.
   *
   * Registered components become available in [`templates`](https://autocomplete.algolia.com/docs/autocomplete-jstemplates), [`render`](https://autocomplete.algolia.com/docs/autocomplete-js#render), and in [`renderNoResults`](https://autocomplete.algolia.com/docs/autocomplete-js#rendernoresults).
   *
   * @link https://autocomplete.algolia.com/docs/autocomplete-js#components
   */
  components?: PublicAutocompleteComponents;
}
