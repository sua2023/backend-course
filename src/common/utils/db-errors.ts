import { QueryFailedError } from 'typeorm';

export const isDuplicateEntry = (error: unknown) =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string } | undefined)?.code === 'ER_DUP_ENTRY';
