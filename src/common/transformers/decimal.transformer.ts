import { ValueTransformer } from 'typeorm';

/** mysql2 returns DECIMAL as a string to avoid precision loss; convert it for JSON. */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};
