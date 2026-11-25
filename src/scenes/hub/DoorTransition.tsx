/** Two brass-edged doors swing apart onto warm light. Purely visual; the scene times navigation. */
export function DoorTransition({ accent, onCancel }: { accent: string; onCancel?: () => void }) {
  return (
    <div class="hub-door" style={{ '--acc': accent }} aria-hidden="true" onClick={onCancel}>
      <div class="hub-door__light" />
      <div class="hub-door__leaf hub-door__leaf--l" />
      <div class="hub-door__leaf hub-door__leaf--r" />
    </div>
  );
}
