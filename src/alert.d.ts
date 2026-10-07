/** A Fetch Request, or a node:http IncomingMessage (its `url` is a relative path). */
export interface AlertRequest {
  method?: string;
  url?: string;
  signal?: AbortSignal;
}

export interface AlertContext {
  request?: AlertRequest;
  shop?: string;
}

export type AlertOps = (error: unknown, context?: AlertContext) => Promise<void>;

export function createAlerter(options: { app: string }): AlertOps;
export function shouldSend(key: string, now: number, sent: Map<string, number>): boolean;
export function isAlertWorthy(error: unknown, request?: AlertRequest): boolean;
export function scrub(text: string): string;
export function routeOf(pathname: string): string;
