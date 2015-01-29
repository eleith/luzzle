var express = require('express');
var passport = require('passport');
var rethinkDB = require('rethinkdb');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser')
var passportLocalStrategy = require('passport-local');
var path = require('path');

var app = express();

// parses cookie headers and sets req.cookies
app.use(cookieParser());

// parses url encoded bodies and sets req.body
app.use(bodyParser.urlencoded({
  extended:true
}));

app.use('/client', express.static(__dirname + '/client.public'));

passport.use(new passportLocalStrategy(
  function(username, password, done) {
    if (username == 'eleith' && password == 'lalala')
      return done(null, {name:username});
    else // user does not exist
      return done(null, false);
  }
));

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  done(null, {name:'eleith'});
});

// parses json encoded bodies and sets req.body
app.use(bodyParser.json());

app.use(passport.initialize());
app.use(passport.session());

// Set the view directory to /client
app.set("views", __dirname + "/client.private");

// Let's use the Jade templating language
app.set("view engine", "jade");

var router = express.Router();

router.route('/account/login')
  .get(function(req, res, next) {
    res.render('app/index', { title: 'Hey', message: 'Hello there!'});
  })
  .post(passport.authenticate('local', {failureRedirect: '/account/login'}), function(req, res, next) {
    res.send('you are logged in!');
  });

app.get('/private', passport.authenticate('local', {failureRedirect: '/account/login'}), function(req, res) {
  res.send('Hello Private World!');
});

app.get('/account/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/', function(req, res) {
  res.send('Hello World!');
});

rethinkDB.connect({host: 'localhost', port: 28015}, function(err, conn) {
  if (err) throw err;
  console.log('connected to rethinkDB');
});

app.use('/', router);

var server = app.listen(5000, function() {
  console.log('Listening on port %d', server.address().port);
});
