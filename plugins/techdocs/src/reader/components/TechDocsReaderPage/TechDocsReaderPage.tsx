/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, {
  ReactNode,
  Children,
  ReactElement,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useOutlet } from 'react-router-dom';

import { ErrorPanel, Page } from '@backstage/core-components';
import { CompoundEntityRef } from '@backstage/catalog-model';
import {
  TECHDOCS_ADDONS_WRAPPER_KEY,
  TECHDOCS_ADDONS_KEY,
  TechDocsReaderPageProvider,
  techdocsApiRef,
} from '@backstage/plugin-techdocs-react';

import { TechDocsReaderPageRenderFunction } from '../../../types';

import { TechDocsReaderPageContent } from '../TechDocsReaderPageContent';
import { TechDocsReaderPageHeader } from '../TechDocsReaderPageHeader';
import { TechDocsReaderPageSubheader } from '../TechDocsReaderPageSubheader';
import { rootDocsRouteRef } from '../../../routes';
import {
  getComponentData,
  useApi,
  useApp,
  useRouteRefParams,
} from '@backstage/core-plugin-api';
import { useAsyncRetry } from 'react-use';

/* An explanation for the multiple ways of customizing the TechDocs reader page

Please refer to this page on the microsite for the latest recommended approach:
https://backstage.io/docs/features/techdocs/how-to-guides#how-to-customize-the-techdocs-reader-page

The <TechDocsReaderPage> component is responsible for rendering the <TechDocsReaderPageProvider> and
its contained version of a <Page>, which in turn renders the <TechDocsReaderPageContent>.

Historically, there have been different approaches on how this <Page> can be customized, and how the
<TechDocsReaderPageContent> inside could be exchanged for a custom implementation (which was not
possible before). Also, the current implementation supports every scenario to avoid breaking default
configurations of TechDocs.

In particular, there are 4 different TechDocs page configurations:

CONFIGURATION 1: <TechDocsReaderPage> only, no children

<Route path="/docs/:namespace/:kind/:name/*" element={<TechDocsReaderPage />} >

This is the simplest way to use TechDocs. Only a full page is passed, assuming that it comes with
its content inside. Since we allowed customizing it, we started providing <TechDocsReaderLayout> as
a default implementation (which contains <TechDocsReaderPageContent>).

CONFIGURATION 2 (not advised): <TechDocsReaderPage> with element children

<Route
  path="/docs/:namespace/:kind/:name/*"
  element={
    <TechDocsReaderPage>
      {techdocsPage}
    </TechDocsReaderPage>
  }
/>

Previously, there were two ways of passing children to <TechDocsReaderPage>: either as elements (as
shown above), or as a render function (described below in CONFIGURATION 3). The "techdocsPage" is
located in packages/app/src/components/techdocs and is the default implementation of the content
inside.

CONFIGURATION 3 (not advised): <TechDocsReaderPage> with render function as child

<Route
  path="/docs/:namespace/:kind/:name/*"
  element={
    <TechDocsReaderPage>
      {({ metadata, entityMetadata, onReady }) => (
        techdocsPage
      )}
    </TechDocsReaderPage>
  }
/>

Similar to CONFIGURATION 2, the direct children will be passed to the <TechDocsReaderPage> but in
this case interpreted as render prop.

CONFIGURATION 4: <TechDocsReaderPage> and provided content in <Route>

<Route
  path="/docs/:namespace/:kind/:name/*"
  element={<TechDocsReaderPage />}
>
  {techDocsPage}
  <TechDocsAddons>
    <ExpandableNavigation />
    <ReportIssue />
    <TextSize />
    <LightBox />
  </TechDocsAddons>
</Route>

This is the current state in packages/app/src/App.tsx and moved the location of children from inside
the element prop in the <Route> to the children of the <Route>. Then, in <TechDocsReaderPage> they
are retrieved using the useOutlet hook from React Router.

NOTE: Render functions are no longer supported in this approach.
*/

/**
 * Props for {@link TechDocsReaderLayout}
 * @public
 */
export type TechDocsReaderLayoutProps = {
  /**
   * Show or hide the header, defaults to true.
   */
  withHeader?: boolean;
  /**
   * Show or hide the content search bar, defaults to true.
   */
  withSearch?: boolean;
};

/**
 * Default TechDocs reader page structure composed with a header and content
 * @public
 */
export const TechDocsReaderLayout = (props: TechDocsReaderLayoutProps) => {
  const { withSearch, withHeader = true } = props;
  return (
    <Page themeId="documentation">
      {withHeader && <TechDocsReaderPageHeader />}
      <TechDocsReaderPageSubheader />
      <TechDocsReaderPageContent withSearch={withSearch} />
    </Page>
  );
};

function TechDocsAuthProvider({ children }: { children: ReactNode }) {
  const app = useApp();
  const { Progress } = app.getComponents();

  const [channel] = useState(new BroadcastChannel('techdocs-cookie-refresh'));

  const techdocsApi = useApi(techdocsApiRef);

  const { loading, error, value, retry } = useAsyncRetry(async () => {
    return await techdocsApi.getCookie();
  }, [techdocsApi]);

  const startCookieRefresh = useCallback(
    (expiresAt: string) => {
      // Randomize the refreshing margin to avoid all tabs refreshing at the same time
      const refreshingMargin = (1 + 3 * Math.random()) * 60_000;
      const delay = Date.parse(expiresAt) - Date.now() - refreshingMargin;
      const timeout = setTimeout(retry, delay);
      return () => clearTimeout(timeout);
    },
    [retry],
  );

  useEffect(() => {
    if (!value) return () => {};
    channel.postMessage({ action: 'COOKIE_REFRESHED', payload: value });
    let stopCookieRefresh = startCookieRefresh(value.expiresAt);
    channel.onmessage = event => {
      const { action, payload } = event.data;
      if (action === 'COOKIE_REFRESHED') {
        stopCookieRefresh();
        stopCookieRefresh = startCookieRefresh(payload.expiresAt);
      }
    };
    return () => {
      stopCookieRefresh();
    };
  }, [value, channel, startCookieRefresh]);

  if (error) {
    return <ErrorPanel error={error} />;
  }

  if (loading) {
    return <Progress />;
  }

  return children;
}

/**
 * @public
 */
export type TechDocsReaderPageProps = {
  entityRef?: CompoundEntityRef;
  children?: TechDocsReaderPageRenderFunction | ReactNode;
};

/**
 * An addon-aware implementation of the TechDocsReaderPage.
 *
 * @public
 */
export const TechDocsReaderPage = (props: TechDocsReaderPageProps) => {
  const { kind, name, namespace } = useRouteRefParams(rootDocsRouteRef);
  const { children, entityRef = { kind, name, namespace } } = props;

  const outlet = useOutlet();

  if (!children) {
    const childrenList = outlet ? Children.toArray(outlet.props.children) : [];

    const grandChildren = childrenList.flatMap<ReactElement>(
      child => (child as ReactElement)?.props?.children ?? [],
    );

    const page: React.ReactNode = grandChildren.find(
      grandChild =>
        !getComponentData(grandChild, TECHDOCS_ADDONS_WRAPPER_KEY) &&
        !getComponentData(grandChild, TECHDOCS_ADDONS_KEY),
    );

    // As explained above, "page" is configuration 4 and <TechDocsReaderLayout> is 1
    return (
      <TechDocsAuthProvider>
        <TechDocsReaderPageProvider entityRef={entityRef}>
          {(page as JSX.Element) || <TechDocsReaderLayout />}
        </TechDocsReaderPageProvider>
      </TechDocsAuthProvider>
    );
  }

  // As explained above, a render function is configuration 3 and React element is 2
  return (
    <TechDocsAuthProvider>
      <TechDocsReaderPageProvider entityRef={entityRef}>
        {({ metadata, entityMetadata, onReady }) => (
          <div className="techdocs-reader-page">
            <Page themeId="documentation">
              {children instanceof Function
                ? children({
                    entityRef,
                    techdocsMetadataValue: metadata.value,
                    entityMetadataValue: entityMetadata.value,
                    onReady,
                  })
                : children}
            </Page>
          </div>
        )}
      </TechDocsReaderPageProvider>
    </TechDocsAuthProvider>
  );
};
