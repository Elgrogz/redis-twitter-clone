const redis = require('redis');
const redisClient = redis.createClient();

const path = require('path');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const session = require('express-session');
const RedisStore = require('connect-redis')(session);

const express = require('express');
const app = express();

// middleware to parse incoming request bodies and expose them in req.body
app.use(express.urlencoded({ extended: true }))

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 36000000, //10 hours in milliseconds
      httpOnly: false,
      // to make sure they work locally
      secure: false,
    },
    secret: 'passwordThing',
  })
);

// set the view engine for the express app, in this case Pug
app.set("view engine", "pug");
// set the view files to be found in the absolute path/views folder
app.set("views", path.join(__dirname, "views"));

// render the index view when the user hits the URL + /
app.get("/", (req, res) => res.render("index"));

// execute this when the UI element that has the POST action for this route is hit
app.post("/", (req, res) => {
  //function to save the session and render the dashboard
  const saveSessionAndRenderDashboard = (userid) => {
    req.session.userid = userid;
    req.session.save();
    res.render('dashboard');
  }

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
  // The user id is returned if there is a match (since it is the value of the 'username')
  redisClient.hget('users', username, (error, userid) => {
    console.log(userid);

    //user does not exist, signup procedure
    if (!userid) {
      // increment the userId by one then pass the new value in the callback
      redisClient.incr('userId', async (error, userid) => {
        // create a new entry in the users hash with the username as key and userid as hash 
        redisClient.hset('users', username, userid);
        // convert the password to a hash
        const hash = await bcrypt.hash(password, saltRounds);
        // create a new user id object with the id, and key value pairs or hash and username with the relevent values
        redisClient.hset(`user:${userid}`, 'hash', hash, 'username', username);
        saveSessionAndRenderDashboard(userid);
      });
    } else {
      //check password if the user does exist
      redisClient.hget(`user:${userid}`, 'hash', async (error, hash) => {
        // compare the password from the form and the stored hash
        const result = await bcrypt.compare(password, hash);

        if (result) {
          saveSessionAndRenderDashboard(userid)
        } else {
          res.render('error', {
            message: "Incorrect Password",
          });
        return;
        }
      });
    }

    //no need for res.end since we all paths are handled with a 'render'
    console.log("Login attempted");
  });

  console.log(req.body);
});

app.listen('3000', () => console.log("Port listening"));




