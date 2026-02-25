const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = "lcbtjkblttbh70ubk0h1zrz9f2ka8i";
const CLIENT_SECRET = "rowzl9cgwicpxna49iybss78co2lcy";

app.post("/token", async (req, res) => {
    const { code, redirect_uri } = req.body;

    const response = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
            grant_type: "authorization_code",
            redirect_uri: redirect_uri
        })
    });

    const data = await response.json();
    res.json(data);
});

app.listen(3000, () => console.log("Server running"));
