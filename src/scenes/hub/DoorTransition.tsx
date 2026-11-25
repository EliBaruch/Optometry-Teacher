/** Two brass-edged doors swing apart onto warm light. Purely visual; the scene times navigation. */
export function DoorTransition({ accent }: { accent: string }) {
  return (
    <div class="hub-door" style={{ '--acc': accent }} aria-hidden="true">
      <div class="hub-door__light" />
      <div class="hub-door__leaf hub-door__leaf--l" />
      <div class="hub-door__leaf hub-door__leaf--r" />
    </div>
  );
}
