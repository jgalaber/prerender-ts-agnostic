const express = require("express");

const PORT = Number(process.env.MOCK_PORT || 3000);
const app = express();

app.disable("x-powered-by");

function html() {
  return `<!DOCTYPE html>
<html>
<head>
  <base href="/" />
  <title>Prerender.io Vue.js Example</title>
</head>
<body>
  <div id="app">
    Logged in user is: Jhon Doe
  </div>
</body>
</html>`;
}

app.use((req, res, next) => {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "no-store");
  next();
});

app.head("*", (req, res) => {
  const body = html(req);
  res.set("Content-Length", Buffer.byteLength(body, "utf8"));
  res.status(200).end();
});

app.get("*", (req, res) => {
  res.status(200).send(html(req));
});

app.listen(PORT, () => {
  console.log(
    `Mock prerender (Express) escuchando en http://localhost:${PORT}`
  );
});

module.exports = app;
