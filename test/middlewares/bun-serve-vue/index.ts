import { file } from "bun";
import Prerender, { Adapters } from "prerender-agnostic";

const prerender = new Prerender().set(
  "prerenderServiceUrl",
  "http://localhost:3000"
);

Bun.serve({
  port: 8003,

  fetch: Adapters.bunPrerender(prerender, (req) => {
    return new Response(file("../public/index.html"), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }),
});

console.log("🚀 http://localhost:8003");
