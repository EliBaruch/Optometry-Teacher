import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import type { GameServices } from '@core';
import { Modal, overlayRoot } from '@ui-kit';
import { ACCENT } from '../state';
import { StreaksDetails } from './Details';

/** Overlays render at <body> level: glass panels' backdrop-filter would otherwise clip a fixed modal. */
function Portal(props: { children: ComponentChildren }) {
  if (typeof document === 'undefined' || !document.body) return <>{props.children}</>;
  return createPortal(<>{props.children}</>, overlayRoot());
}

export function DetailsModal({ services, open, onClose }: { services: GameServices; open: boolean; onClose: () => void }) {
  return (
    <Portal>
      <Modal open={open} onClose={onClose} title="Streaks" eyebrow="Your clinic flame" icon="flame" size="lg" accent={ACCENT} class="sk-modal">
        <StreaksDetails services={services} />
      </Modal>
    </Portal>
  );
}
