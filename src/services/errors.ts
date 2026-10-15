/** Thrown by service functions when a business rule is violated. The UI shows `message` in a toast. */
export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceError';
  }
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ServiceError(message);
}
