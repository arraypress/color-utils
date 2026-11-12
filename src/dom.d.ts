// What colours a page's text really shows in, from computed styles (browser only).

import type { Rgba } from './rgba.js';

/** The canvas of a page that hasn't opted into dark: white. */
export const LIGHT_CANVAS: Readonly<Rgba>;

/** Chrome's dark canvas: rgb(18 18 18). */
export const DARK_CANVAS: Readonly<Rgba>;

/** What's behind text. */
export type Behind = 'solid' | 'gradient' | 'image' | 'effect';

/** The colours text shows in. */
export interface PaintedText {
  /** What's behind it. */
  behind: Behind;
  /** The text's colour as it shows and the opaque background under it: one pair when solid, one per gradient colour, none when unknown. */
  pairs: { text: Rgba; background: Rgba }[];
}

/** The style properties read. */
export type StyleRead = Pick<CSSStyleDeclaration, 'backgroundColor' | 'backgroundImage' | 'opacity' | 'filter' | 'mixBlendMode' | 'display' | 'color' | 'getPropertyValue'>;

/** The page's canvas colour: Chrome's dark one when the page's colour scheme is (or allows and the person prefers) dark. */
export function canvasColor(doc: Document): Rgba;

/** An element's parent as painted: its slot (open shadow roots), its parent, or its shadow root's host. */
export function paintParent(element: Element): Element | null;

/** The colours an element's text shows in, its ancestors' backgrounds laid from the canvas up, group opacity included. */
export function paintedColors(element: Element, options?: { style?: (element: Element) => StyleRead; canvas?: Rgba; text?: Rgba }): PaintedText;

/** Any CSS colour as Chrome works it out inside `parent` (`light-dark()`, `color-mix()`, system colours too); null when it isn't one or depends on the element. */
export function computedColor(value: string, parent: Element): Rgba | null;
