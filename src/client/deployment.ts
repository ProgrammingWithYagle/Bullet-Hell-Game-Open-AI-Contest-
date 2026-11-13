// Public endpoint, not a credential. VITE_GAME_SERVER can override a deployment.
export const productionGameServer = 'https://grave-accord-playtest.onrender.com';
export const defaultGameEndpoint = import.meta.env?.VITE_GAME_SERVER ??
  (import.meta.env?.PROD ? productionGameServer : 'http://localhost:2567');
export const onlinePlaytestSlots =
  import.meta.env?.PROD &&
  (import.meta.env.VITE_GAME_SERVER ?? productionGameServer) === productionGameServer
    ? 8
    : undefined;
