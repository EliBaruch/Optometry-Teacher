import type { ComponentChildren } from 'preact';
import './Kbd.css';

/** A keyboard key cap: <Kbd>Esc</Kbd>, <Kbd>←</Kbd> */
export function Kbd(props: { children: ComponentChildren; class?: string }) {
  return <kbd class={`lm-kbd${props.class ? ' ' + props.class : ''}`}>{props.children}</kbd>;
}
