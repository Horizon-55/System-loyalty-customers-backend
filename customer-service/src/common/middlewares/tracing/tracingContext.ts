import { AsyncLocalStorage } from 'async_hooks';

export const tracingContext = new AsyncLocalStorage<string>();