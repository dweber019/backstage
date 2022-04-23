# @backstage/plugin-website-proxy-backend

Backend for the `@backstage/plugin-website-proxy` plugin.

## Installation

```bash
# From your Backstage root directory
yarn add --cwd packages/backend @backstage/plugin-website-proxy-backend
```

Then integrate the plugin using the following default setup for `packages/backend/src/plugins/website-proxy.ts`:

```ts
// In packages/backend/src/index.ts

import { createRouter } from '@backstage/plugin-website-proxy-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    logger: env.logger,
  });
}
```

And then add to `packages/backend/src/index.ts`:

```js
// In packages/backend/src/index.ts

import websiteProxy from './plugins/website-proxy';
// ...
async function main() {
  // ...
  const websiteProxyEnv = useHotMemoize(module, () => createEnv('websiteProxy'));
  // ...
  apiRouter.use('/website-proxy', await todo(websiteProxyEnv));
```
