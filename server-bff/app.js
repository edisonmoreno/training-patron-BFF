import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";

const app = express();
const portServerBFF = 3080;
const hostFrontend = "http://localhost:3000";
const hostServerBFF = `http://localhost:${portServerBFF}`;
const hostBackend = "http://localhost:8080";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", hostFrontend); // CrossOrigin
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS, PUT, PATCH, DELETE"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "X-Requested-With,content-type"
    );
    res.setHeader("Access-Control-Allow-Credentials", true);
    next();
});

app.get("/", (req, res) => {
    let result = {
        name: "Hello World!",
        training: "Arquitectura",
        project: "Pattern BFF",
    };
    res.send(result);
});

// [Get] api/todos
app.get("/api-bff/todos", async function (req, response) {
    console.log("Get");
    let data = await fetch(`${hostBackend}/api/todos`).then((res) =>
        res.json()
    );
    response.send(data);
});

// [Post] api/todo
app.post("/api-bff/todo", async (req, res) => {
    console.log("Post");
    const response = await fetch(`${hostBackend}/api/todo`, {
        method: "POST",
        body: JSON.stringify(req.body),
        headers: { "content-type": "application/json" },
    });
    const data = await response.text();
    res.set("content-type", "application/json");
    res.status(response.status);
    res.send(data);
});

// [Put] api/todo
app.put("/api-bff/todo", async (req, res) => {
    console.log("Put");
    const response = await fetch(`${hostBackend}/api/todo`, {
        method: "PUT",
        body: JSON.stringify(req.body),
        headers: { "content-type": "application/json" },
    });
    const data = await response.text();
    res.set("content-type", "application/json");
    res.status(response.status);
    res.send(data);
});

// [Delete] api/{id}/todo
app.delete("/api-bff/:id/todo", async function (req, response) {
    let idTodo = req.params["id"];
    console.log("Delete: " + idTodo);

    let data = await fetch(`${hostBackend}/api/${idTodo}/todo`, {
        method: "DELETE",
    });
    response.send(data);
});

// [Get] api/{id}/todo
app.get("/api-bff/:id/todo", async function (req, response) {
    let idTodo = req.params["id"];
    console.log("Get: " + idTodo);

    let data = await fetch(`${hostBackend}/api/${idTodo}/todo`).then((res) =>
        res.json()
    );
    response.send(data);
});

app.listen(portServerBFF, () => {
    console.log(`App listening at ${hostServerBFF}`);
});
