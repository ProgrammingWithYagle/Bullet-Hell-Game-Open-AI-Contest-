// Public endpoint, not a credential. VITE_GAME_SERVER can override a deployment.
export const productionGameServer = 'https://grave-accord-playtest.onrender.com';
export const onlinePlaytestSlots =
  import.meta.env?.PROD &&
  (import.meta.env.VITE_GAME_SERVER ?? productionGameServer) === productionGameServer
    ? 8
    : undefined;
