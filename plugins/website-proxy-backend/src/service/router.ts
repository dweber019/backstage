/*
 * Copyright 2020 The Backstage Authors
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

import express from 'express';
import { Request } from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { errorHandler } from '@backstage/backend-common';
import proxy from 'express-http-proxy';

/**
 * @public
 */
export interface RouterOptions {
  logger: Logger;
}

/** @public */
export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger } = options;

  const router = Router();
  router.use(express.text());

  const getProxyUrl = (req: Request) => {
    const proxyUrl = req.query.url as string;
    if (!proxyUrl || Array.isArray(proxyUrl)) {
      throw new Error(
        `failed to fetch data, query parameter url undefined or array`,
      );
    }
    return proxyUrl;
  };

  const getBasePath = (uri: string) => {
    const url = new URL(uri);
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
  };

  const getPath = (uri: string) => {
    const url = new URL(uri);
    return `${url.pathname}${url.hash}${url.search}`;
  };

  const selectProxyHost = (req: Request) => {
    const proxyUrl = getProxyUrl(req);
    const host = getBasePath(getProxyUrl(req));
    logger.info(`Proxy to host ${host} for url ${proxyUrl}`);
    return host;
  };

  router.use(
    '/',
    proxy(selectProxyHost, {
      memoizeHost: false,
      proxyReqPathResolver: req => {
        logger.info(`proxyReqPathResolver ${req.path}`);
        if (req.path.length > 1) return req.path;
        const proxyUrl = getProxyUrl(req);
        const path = getPath(proxyUrl);
        logger.info(`Proxy to path ${path} for url ${proxyUrl}`);
        return path;
      },
      userResDecorator: (...args) => {
        // logger.warn(proxyResData.toString('utf8'));
        const [proxyResData, userReq] = args;
        const proxyUrl = encodeURIComponent(getProxyUrl(userReq));
        let html = proxyResData.toString();

        const foundMatches = [
          ...html.matchAll(/<(link|script)\s.*(href|src)=['"]\/(.*?)['"]/gi),
        ];
        foundMatches.forEach(value => {
          logger.warn(`foundMatch: ${value[3]}`);
          html = html.replace(
            `/${value[3]}`,
            `/api/website-proxy/${value[3]}?url=${proxyUrl}`,
          );
        });

        // logger.warn('html: ' + html);

        return html;
      },
    }),
  );

  router.use(errorHandler());

  return router;
}
