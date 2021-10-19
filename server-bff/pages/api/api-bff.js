const express = require("express");
const next = require("next");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fetch = require("isomorphic-unfetch");

const { NODE_ENV, API_URL, PORT } = process.env;

const rtCookieName = "refreshToken";

const catchErrors = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.log(new Date(Date.now()).toISOString(), e);
    res.status(500);
    res.send(e);
  }
};

const fetchAPI = async (path, body, headers) => {
  const res = await fetch(`${API_URL}/api/v1/${path}`, {
    method: "post",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return {
    body: await res.text(),
    status: res.status,
    headers: res.headers,
  };
};

const forwardHeader = (res, apiRes, header) => {
  if (apiRes.headers.get(header)) {
    res.set(header, apiRes.headers.get(header));
  }
};

const forwardResponse = (res, apiRes) => {
  forwardHeader(res, apiRes, "content-type");
  forwardHeader(res, apiRes, "www-authenticate");
  // additional whitelisted headers here
  res.status(apiRes.status);
  res.send(apiRes.body);
};

const writeRefreshCookie = (res, refreshToken, refreshAge) => {
  res.cookie(rtCookieName, refreshToken, {
    path: "/api/v1/token",
    // received in second, must be passed in as nanosecond
    expires: new Date(Date.now() + refreshAge * 1000 * 1000).toUTCString(),
    maxAge: refreshAge * 1000, // received in second, must be passed in as millisecond
    httpOnly: true,
    secure: NODE_ENV !== "dev",
    sameSite: "Strict",
  });
};

const forwardRefreshToken = (res, apiRes) => {
  try {
    const { refreshToken, refreshAge } = JSON.parse(apiRes.body);
    writeRefreshCookie(res, refreshToken, refreshAge);
  } catch {}
};

const nextApp = next({ dev: NODE_ENV === "dev" });
nextApp
  .prepare()
  .then(() => {
    const server = express();

    server.use(bodyParser.urlencoded({ extended: true }));
    server.use(bodyParser.json());
    server.use(cookieParser());

    server.post(
      "/api/v1/login",
      catchErrors(async (req, res) => {
        const apiRes = await fetchAPI("login", req.body);
        forwardRefreshToken(res, apiRes);
        forwardResponse(res, apiRes);
      })
    );

    server.post(
      "/api/v1/token/refresh",
      catchErrors(async (req, res) => {
        const refreshToken = req.cookies[rtCookieName];
        const apiRes = await fetchAPI("token/refresh", { refreshToken });
        forwardRefreshToken(res, apiRes);
        forwardResponse(res, apiRes);
      })
    );

    server.post(
      "/api/v1/token/invalidate",
      catchErrors(async (req, res) => {
        const refreshToken = req.cookies[rtCookieName];
        const apiRes = await fetchAPI("token/invalidate", { refreshToken });
        writeRefreshCookie(res, "", -1);
        forwardResponse(res, apiRes);
      })
    );

    server.post(
      "/api/v1/graphql",
      catchErrors(async (req, res) => {
        const apiRes = await fetchAPI("graphql", req.body, {
          Authorization: req.header("Authorization"),
        });
        forwardResponse(res, apiRes);
      })
    );

    server.all("*", nextApp.getRequestHandler());

    server.listen(PORT, (err) => {
      if (err) {
        throw err;
      }
      console.log(`> Ready on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("An error occurred, unable to start the server");
    console.log(err);
  });
