# website-proxy

Welcome to the website-proxy plugin!

## Installation

### Install the plugin

```bash
# From your Backstage root directory
yarn add --cwd packages/app @backstage/plugin-website-proxy
```

Then add the `EntityWebsiteProxyCard` to a route, an entity page as tab or in the entity overview.

```tsx
// packages/app/src/components/catalog/EntityPage.tsx

import { EntityWebsiteProxyCard } from '@backstage/plugin-website-proxy';

const serviceEntityPage = (
  <EntityLayoutWrapper>
    <EntityLayout.Route path="/" title="Overview">
      {overviewContent}
    </EntityLayout.Route>
    <EntityLayout.Route path="/ci-cd" title="CI/CD">
      {cicdContent}
    </EntityLayout.Route>
    ...
    <EntityLayout.Route path="/w3schools" title="w3schools">
      <EntityWebsiteProxyCard name="w3schools" />
    </EntityLayout.Route>
    ...
  </EntityLayoutWrapper>
);
```

The name prop is mandatory and has to match the annotation in the usage section.

Additionally, there is the `isWebsiteProxyAvailable` for you.

```tsx
<EntitySwitch>
  <EntitySwitch.Case
    if={entity => isWebsiteProxyAvailable('w3schools', entity)}
  >
    <Grid item xs={6} style={{ height: '300px' }}>
      <EntityWebsiteProxyCard name="w3schools" disableViewHeight />
    </Grid>
  </EntitySwitch.Case>
</EntitySwitch>
```

## Usage

Use the annotation `website-proxy/<name>` on your entity.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: website-proxy-example
  description: This is an example
  tags:
    - website-proxy
  annotations:
    website-proxy/w3schools: https://www.w3schools.com/
spec:
  type: website
  lifecycle: production
  owner: team-b
```

### Proxy websites

Sometimes, websites are protected to be used in a `embed` tag directly.  
To avoid this use the `useProxy` prop to get the website through a built-in proxy.

```tsx
<EntityWebsiteProxyCard name="w3schools" useProxy />
```

The proxy is provided by `@backstage/website-proxy-backend`.
