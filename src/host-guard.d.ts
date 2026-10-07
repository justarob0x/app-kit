export function guardHost<F extends (request: Request) => Promise<unknown>>(authenticateAdmin: F): F;
