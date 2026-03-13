import { create } from "zustand";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TicketState {
  // Placeholder for future ticket management state
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TicketActions {
  // Placeholder for future ticket management actions
}

export const useTicketStore = create<TicketState & TicketActions>(() => ({
  // Empty store — will be populated when ticket system is built
}));
