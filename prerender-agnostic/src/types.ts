export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  connection?: {
    encrypted?: boolean;
  };
}

export interface HttpResponse {
  writeHead(statusCode: number, headers?: Record<string, string>): void;
  end(data?: string): void;
}

export type NextFunction = (error?: any) => void;

export interface PrerenderResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface CachedRender {
  status?: number;
  body?: string;
}

export interface AfterRenderOptions {
  cancelRender?: boolean;
}

export type BeforeRenderCallback = (err?: Error, cachedRender?: string | CachedRender) => void;

export type AfterRenderCallback = (
  err: Error | null,
  req: HttpRequest,
  prerenderedResponse: PrerenderResponse | null,
) => AfterRenderOptions | void;

export type GetPrerenderedPageCallback = (
  err: Error | null,
  response: PrerenderResponse | null,
) => void;

export interface PrerenderModule {
  (req: HttpRequest, res: HttpResponse, next: NextFunction): void;
  crawlerUserAgents: string[];
  extensionsToIgnore: string[];
  whitelist?: string[];
  blacklist?: string[];
  prerenderServerRequestOptions: Record<string, any>;
  forwardHeaders?: boolean;
  prerenderToken?: string;
  prerenderServiceUrl?: string;
  protocol?: string;
  host?: string;
  beforeRender?: (req: HttpRequest, done: BeforeRenderCallback) => void;
  afterRender?: AfterRenderCallback;

  whitelisted(whitelist: string | string[]): PrerenderModule;
  blacklisted(blacklist: string | string[]): PrerenderModule;
  shouldShowPrerenderedPage(req: HttpRequest): boolean;
  getPrerenderedPageResponse(req: HttpRequest, callback: GetPrerenderedPageCallback): void;
  gunzipResponse(response: any, callback: GetPrerenderedPageCallback): void;
  plainResponse(response: any, callback: GetPrerenderedPageCallback): void;
  buildApiUrl(req: HttpRequest): string;
  getPrerenderServiceUrl(): string;
  beforeRenderFn(req: HttpRequest, done: BeforeRenderCallback): void;
  afterRenderFn(
    err: Error | null,
    req: HttpRequest,
    prerender_res: PrerenderResponse | null,
  ): AfterRenderOptions | void;
  set(name: string, value: any): PrerenderModule;
  addUserAgents(newAgents: string | string[]): PrerenderModule;
}
