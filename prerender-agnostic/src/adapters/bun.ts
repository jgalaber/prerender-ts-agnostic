import type { Prerender } from '../core/prerender';
import type { HttpRequest, HttpResponse, NextFunction } from '../types';

export function bunPrerender(
  prer: Prerender,
  nextFetch?: (req: Request) => Promise<Response> | Response,
) {
  return async function fetch(request: Request): Promise<Response> {
    const u = new URL(request.url);

    const headersObj: Record<string, string> = {};
    request.headers.forEach((v, k) => (headersObj[k.toLowerCase()] = v));

    const nodeReq: HttpRequest = {
      method: request.method,
      url: u.pathname + u.search,
      headers: headersObj as any,
      connection: { encrypted: u.protocol === 'https:' } as any,
    } as any;

    return await new Promise<Response>((resolve, reject) => {
      let statusCode = 200;
      const outHeaders = new Headers();

      const resAdapter: HttpResponse = {
        writeHead(code: number, headers?: Record<string, any>) {
          statusCode = code;
          if (headers) {
            for (const [k, v] of Object.entries(headers)) {
              outHeaders.set(k, Array.isArray(v) ? v.join(', ') : String(v));
            }
          }
        },
        setHeader(name: string, value: any) {
          outHeaders.set(name, Array.isArray(value) ? value.join(', ') : String(value));
        },

        status(code: number) {
          statusCode = code;
          return resAdapter as any;
        },
        end(chunk?: any) {
          let body = '';
          if (typeof chunk === 'string') body = chunk;
          else if (chunk instanceof Uint8Array) body = new TextDecoder().decode(chunk);
          else if (chunk != null) body = String(chunk);
          resolve(new Response(body, { status: statusCode, headers: outHeaders }));
        },
      } as any;

      const next: NextFunction = (err?: any) => {
        if (err) return reject(err);
        if (nextFetch) {
          Promise.resolve(nextFetch(request)).then(resolve, reject);
        } else {
          resolve(new Response('Not prerendered', { status: 404 }));
        }
      };

      try {
        prer.middleware(nodeReq, resAdapter, next);
      } catch (e) {
        reject(e);
      }
    });
  };
}
