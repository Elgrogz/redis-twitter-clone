const redis = require('redis');
const redisClient = redis.createClient();

const path = require('path');

const bcrypt = require('bcrypt');
const saltRounds = 10;


const express = require('express');
const app = express();


app.use(express.urlencoded({ extended: true }))

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => res.render("index"));

app.post("/", (req, res) => {
  // save the username and password parsed from the request body (using URL encoded).
  // These are grabbed based on the `name` HTML attribute in the form.
  const { username, password } = req.body;

  // if they aren't supplied in the HTML request, return the following response view and message
  if (!username || !password) {
    res.render("error", {
      message: "Please enter both a username and a password"
    });
    return;
  }

  // using the username, see if there is a user that matches the username in the 'users' store, then call the callback.
  // The user id is returned if there is a match
  redisClient.hget('users', username, (error, userid) => {
    console.log(userid);

    if (!userid) {
      //user does not exist, signup procedure
      redisClient.incr('userId', async (error, userid) => {
        redisClient.hset('users', username, userid);
        const hash = await bcrypt.hash(password, saltRounds);
        redisClient.hset(`user:${userid}`, 'hash', hash, 'username', username);
      });
    } else {
      //check password
      redisClient.hget(`user:${userid}`, 'hash', async (error, hash) => {
        const result = await bcrypt.compare(password, hash);
        if (result) {
          
        } else {

        }
      });
    }
  });

  console.log(req.body, username, password);
  res.end();
});

app.listen('3000', () => console.log("Port listening"));




