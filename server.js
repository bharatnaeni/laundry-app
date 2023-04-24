const express = require("express");
const path = require("path");
const cors = require("cors");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "laundry.db");
const app = express();

app.use(express.json());
app.use(cors());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(5000, () => {
      console.log("Server Running at http://localhost:5000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid Access Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.send("Invalid Access Token");
      } else {
        request.username = payload.username;
        next();
        console.log(payload);
      }
    });
  }
};

//User Register API
app.post("/users/", async (request, response) => {
  const { username, password, email, phonenumber } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        users (username, password, email, phonenumber) 
      VALUES 
        (
          '${username}',
          '${hashedPassword}', 
          '${email}',
          '${phonenumber}'
        )`;
    await db.run(createUserQuery);
    response.send(`User created successfully`);
  } else {
    response.status(400);
    response.res.json({ status: "User already exists" });
  }
});

//User Login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

//Insert request
app.post("/request", authenticateToken, async (request, response) => {
  console.log(request);
  const { username } = request;
  const {
    date,
    topware,
    bottomware,
    woolen,
    others,
    service,
    contact,
    description,
  } = request.body;
  const addRequestQuery = `
    INSERT INTO
      requests (username,date,topware,bottomware,woolen,others,service,contact,description)
    VALUES
      (
        '${username}',
         '${date}',
         '${topware}',
         '${bottomware}',
         '${woolen}',
        '${others}',
         '${service}',
        '${contact}',
        '${description}'
      );`;

  const dbResponse = await db.run(addRequestQuery);
  const requestId = dbResponse.lastID;
  response.send({ requestId: requestId });
});

//Get Request
app.get("/status", authenticateToken, async (request, response) => {
  const { username } = request;
  console.log(username);
  const getBookQuery = `
    SELECT
      *
    FROM
      requests
    WHERE
      username = '${username}';`;
  const requests = await db.all(getBookQuery);
  response.send(requests);
});
