import express from "express";
import Prerender, { Adapters } from "prerender-agnostic";

const PORT = 8002;
const app = express();

app.use(
  Adapters.expressPrerender(
    new Prerender().set("prerenderServiceUrl", "http://localhost:3000")
  )
);
app.use(express.static("../public"));

app.listen(PORT, () => {
  console.log(
    `Prerender Vue.js example app is listening at http://localhost:${PORT}`
  );
});
