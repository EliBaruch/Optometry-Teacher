import { Component, type ComponentChildren } from 'preact';

/**
 * Keeps a procedural-art failure (avatar, eye painter) from taking the whole
 * results screen down: the art is decoration, the review must always render.
 */
export class Safe extends Component<{ children: ComponentChildren; fallback?: ComponentChildren }, { failed: boolean }> {
  override state = { failed: false };
  static override getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.setState({ failed: true });
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
