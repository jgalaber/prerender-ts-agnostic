import type { Prerender } from '../core/prerender';
import type { HttpRequest, HttpResponse } from '../types';

export function expressPrerender(handler: Prerender) {
  return (req: any, res: any, next: any) => {
    const httpReq: HttpRequest = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      connection: req.connection,
    };

    const httpRes: HttpResponse = {
      writeHead: (statusCode: number, headers?: Record<string, string>) => {
        res.statusCode = statusCode;
        if (headers) {
          Object.keys(headers).forEach((key) => {
            res.setHeader(key, headers[key]);
          });
        }
      },
      end: (data?: string) => {
        res.end(data);
      },
    };

    handler.middleware(httpReq, httpRes, next);
  };
}
