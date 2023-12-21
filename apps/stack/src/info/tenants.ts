import { getTenants } from '../config/tenants';
import { ApiHandler } from 'sst/node/api';

export const handler = ApiHandler(async (_evt) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      tenants: getTenants().map(({tenant}) => tenant),
    }),
  };
});
