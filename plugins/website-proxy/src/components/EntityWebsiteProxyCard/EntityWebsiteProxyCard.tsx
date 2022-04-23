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
import React from 'react';
import { Entity } from '@backstage/catalog-model';
import { useEntity } from '@backstage/plugin-catalog-react';
import { Alert } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core';
import { configApiRef, useApi } from '@backstage/core-plugin-api';

/**
 * Constant storing the website-proxy url.
 *
 * @public
 */
export const WEBSITE_PROXY_NAME_ANNOTATION_PREFIX = 'website-proxy/';

const getAnnotation = (name: string) =>
  `${WEBSITE_PROXY_NAME_ANNOTATION_PREFIX}${name}`;

/**
 * Returns true if website-proxy annotation is present in the given entity.
 *
 * @public
 */
export const isWebsiteProxyAvailable = (
  name: string,
  entity: Entity,
): boolean =>
  (entity.metadata.annotations &&
    Object.keys(entity.metadata.annotations).some(
      annotation => annotation === getAnnotation(name),
    )) ||
  false;

const getUrl = (name: string, entity: Entity) =>
  entity.metadata.annotations?.[getAnnotation(name)] || '';

const getContentWithProxy = (
  name: string,
  entity: Entity,
  backendUrl: string,
) => {
  return `${backendUrl}/api/website-proxy?url=${encodeURIComponent(
    getUrl(name, entity),
  )}`;
};

const useStyles = makeStyles(() => ({
  embed: {
    width: '100%',
  },
}));

export const EntityWebsiteProxyCard = ({
  name,
  useProxy,
  disableViewHeight,
}: {
  name: string;
  useProxy?: boolean;
  disableViewHeight?: boolean;
}) => {
  const classes = useStyles();
  const { entity } = useEntity();
  const config = useApi(configApiRef);
  const backendUrl = config.getString('backend.baseUrl');

  if (!getUrl(name, entity)) {
    return (
      <Alert severity="error">
        Annotation{' '}
        <pre>{getAnnotation(name)} doesn't exist on this entity!</pre>
      </Alert>
    );
  }

  return (
    <embed
      type="text/html"
      src={
        Boolean(useProxy)
          ? getContentWithProxy(name, entity, backendUrl)
          : getUrl(name, entity)
      }
      className={classes.embed}
      style={{ height: disableViewHeight ? '100%' : '100vh' }}
    />
  );
};
