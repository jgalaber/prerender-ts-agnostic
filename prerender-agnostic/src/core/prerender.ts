import * as url from 'url';
import * as zlib from 'zlib';

import type {
  AfterRenderOptions,
  BeforeRenderCallback,
  GetPrerenderedPageCallback,
  PrerenderResponse,
  HttpRequest,
  HttpResponse,
  NextFunction,
} from '../types';

import {
  CRAWLER_UA_REGEX,
  CRAWLER_USER_AGENTS,
  EXT_IGNORE_REGEX,
  HTTP_ADAPTERS,
  PRERENDER_SERVICE_URL,
} from '../constants';
import { buildUaRegex } from './regex-utils';

export class Prerender {
  [key: string]: any; // Able dynamic props

  private uaSet = new Set<string>(CRAWLER_USER_AGENTS.map((s) => s.toLowerCase()));
  public crawlerUserAgents: RegExp = CRAWLER_UA_REGEX;
  public extensionsToIgnore: RegExp = EXT_IGNORE_REGEX;
  public whitelist?: string[];
  public blacklist?: string[];
  public prerenderServerRequestOptions: Record<string, any> = {};
  public forwardHeaders?: boolean;
  public prerenderToken?: string;
  public prerenderServiceUrl?: string;
  public protocol?: string;
  public host?: string;

  public beforeRender?: (req: HttpRequest, done: BeforeRenderCallback) => void;
  public afterRender?: (
    err: Error | null,
    req: HttpRequest,
    prerender_res: PrerenderResponse | null,
  ) => AfterRenderOptions | void;

  public middleware(req: HttpRequest, res: HttpResponse, next: NextFunction): void {
    if (!this.shouldShowPrerenderedPage(req)) return next();

    this.beforeRenderFn(req, (err, cachedRender) => {
      if (!err && cachedRender) {
        if (typeof cachedRender === 'string') {
          res.writeHead(200, {
            'Content-Type': 'text/html',
          });
          return res.end(cachedRender);
        } else if (typeof cachedRender === 'object') {
          res.writeHead(cachedRender.status || 200, {
            'Content-Type': 'text/html',
          });
          return res.end(cachedRender.body || '');
        }
      }

      this.getPrerenderedPageResponse(req, (err, prerenderedResponse) => {
        var options = this.afterRenderFn(err, req, prerenderedResponse);
        if (options && options.cancelRender) {
          return next();
        }

        if (prerenderedResponse) {
          res.writeHead(prerenderedResponse.statusCode, prerenderedResponse.headers);
          return res.end(prerenderedResponse.body);
        } else {
          next(err);
        }
      });
    });
  }

  public whitelisted(whitelist: string | string[]): this {
    this.whitelist = typeof whitelist === 'string' ? [whitelist] : whitelist;
    return this;
  }

  public blacklisted(blacklist: string | string[]): this {
    this.blacklist = typeof blacklist === 'string' ? [blacklist] : blacklist;
    return this;
  }

  public getPrerenderServiceUrl(): string {
    return this.prerenderServiceUrl || process.env.PRERENDER_SERVICE_URL || PRERENDER_SERVICE_URL;
  }

  public beforeRenderFn(req: HttpRequest, done: BeforeRenderCallback): void {
    if (!this.beforeRender) return done();

    return this.beforeRender(req, done);
  }

  public afterRenderFn(
    err: Error | null,
    req: HttpRequest,
    prerender_res: PrerenderResponse | null,
  ): AfterRenderOptions | void {
    if (!this.afterRender) return;

    return this.afterRender(err, req, prerender_res);
  }

  public set(name: string, value: any): this {
    this[name] = value;
    return this;
  }

  public addUserAgents(newAgents: string | string[]): this {
    const arr = Array.isArray(newAgents) ? newAgents : [newAgents];
    let changed = false;

    for (const raw of arr) {
      const s = String(raw || '').trim();
      if (!s) continue;
      const key = s.toLowerCase();
      if (!this.uaSet.has(key)) {
        this.uaSet.add(key);
        changed = true;
      }
    }

    if (changed) {
      this.crawlerUserAgents = buildUaRegex(this.uaSet);
    }
    return this;
  }

  private shouldShowPrerenderedPage(req: HttpRequest): boolean {
    const userAgent = req.headers['user-agent'] as string;
    const bufferAgent = req.headers['x-bufferbot'];

    let isRequestingPrerenderedPage = false;

    if (!userAgent) return false;
    if (req.method != 'GET' && req.method != 'HEAD') return false;
    if (req.headers && req.headers['x-prerender']) return false;

    const parsedUrl = url.parse(req.url, true);
    //if it contains _escaped_fragment_, show prerendered page
    const parsedQuery = parsedUrl.query;
    if (parsedQuery && parsedQuery['_escaped_fragment_'] !== undefined)
      isRequestingPrerenderedPage = true;

    //if it is a bot...show prerendered page
    const isBot = this.crawlerUserAgents.test(userAgent || '');
    if (isBot) isRequestingPrerenderedPage = true;

    //if it is BufferBot...show prerendered page
    if (bufferAgent) isRequestingPrerenderedPage = true;

    //if it is a bot and is requesting a resource...dont prerender
    const pathname = parsedUrl.pathname || '';
    const isIgnorable = this.extensionsToIgnore.test(pathname);
    if (isIgnorable) return false;

    //if it is a bot and not requesting a resource and is not whitelisted...dont prerender
    const isWhiteListed =
      Array.isArray(this.whitelist) &&
      this.whitelist.every(function (whitelisted) {
        return new RegExp(whitelisted).test(req.url) === false;
      });
    if (isWhiteListed) return false;

    //if it is a bot and not requesting a resource and is not blacklisted(url or referer)...dont prerender
    const isBotAndDontBeBlacklisted =
      Array.isArray(this.blacklist) &&
      this.blacklist.some((blacklisted) => {
        var blacklistedUrl = false;
        var blacklistedReferer = false;
        var regex = new RegExp(blacklisted);

        blacklistedUrl = regex.test(req.url) === true;
        if (req.headers['referer'])
          blacklistedReferer = regex.test(req.headers['referer'] as string) === true;

        return blacklistedUrl || blacklistedReferer;
      });
    if (isBotAndDontBeBlacklisted) return false;

    return isRequestingPrerenderedPage;
  }

  private getPrerenderedPageResponse(req: HttpRequest, callback: GetPrerenderedPageCallback): void {
    const options: any = {
      headers: {},
    };
    for (let attrname in this.prerenderServerRequestOptions) {
      options[attrname] = this.prerenderServerRequestOptions[attrname];
    }

    if (this.forwardHeaders === true) {
      Object.keys(req.headers).forEach((h) => {
        // Forwarding the host header can cause issues with server platforms that require it to match the URL
        if (h == 'host') {
          return;
        }
        options.headers[h] = req.headers[h];
      });
    }

    options.headers['User-Agent'] = req.headers['user-agent'];
    options.headers['X-Prerender-Int-Type'] = 'Node';
    options.headers['Accept-Encoding'] = 'gzip';

    if (this.prerenderToken || process.env.PRERENDER_TOKEN) {
      options.headers['X-Prerender-Token'] = this.prerenderToken || process.env.PRERENDER_TOKEN;
    }

    const requestUrl = new URL(this.buildApiUrl(req));
    // Dynamically use "http" or "https" module, since process.env.PRERENDER_SERVICE_URL can be set to http protocol
    HTTP_ADAPTERS[requestUrl.protocol]
      .get(requestUrl, options, (response) => {
        if (
          response.headers['content-encoding'] &&
          response.headers['content-encoding'] === 'gzip'
        ) {
          this.gunzipResponse(response, callback);
        } else {
          this.plainResponse(response, callback);
        }
      })
      .on('error', function (err: any) {
        callback(err, null);
      });
  }

  private gunzipResponse(response: any, callback: GetPrerenderedPageCallback): void {
    const gunzip = zlib.createGunzip();
    let content = '';

    gunzip.on('data', function (chunk) {
      content += chunk;
    });
    gunzip.on('end', function () {
      response.body = content;
      delete response.headers['content-encoding'];
      delete response.headers['content-length'];
      callback(null, response);
    });
    gunzip.on('error', function (err) {
      callback(err, null);
    });

    response.pipe(gunzip);
  }

  private plainResponse(response: any, callback: GetPrerenderedPageCallback): void {
    let content = '';

    response.on('data', function (chunk: any) {
      content += chunk;
    });
    response.on('end', function () {
      response.body = content;
      callback(null, response);
    });
  }

  private buildApiUrl(req: HttpRequest): string {
    const prerenderUrl = this.getPrerenderServiceUrl();
    const forwardSlash = prerenderUrl.indexOf('/', prerenderUrl.length - 1) !== -1 ? '' : '/';

    let protocol = req.connection?.encrypted ? 'https' : 'http';
    if (req.headers['cf-visitor']) {
      const match = (req.headers['cf-visitor'] as string).match(/"scheme":"(http|https)"/);
      if (match) protocol = match[1];
    }
    if (req.headers['x-forwarded-proto']) {
      protocol = (req.headers['x-forwarded-proto'] as string).split(',')[0];
    }
    if (this.protocol) {
      protocol = this.protocol;
    }
    const fullUrl =
      protocol +
      '://' +
      (this.host || req.headers['x-forwarded-host'] || req.headers['host']) +
      req.url;
    return prerenderUrl + forwardSlash + fullUrl;
  }
}
