var express = require('express')
  , _ = require('underscore')
  , app = express.createServer()
  , OAuth = require('oauth').OAuth

// Express config
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.cookieParser());
app.use(express.favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());
app.use(express.session({secret: "asdklasl3"}));

// Oauth config
var oa = new OAuth("https://www.boredatbaker.com/api/v1/oauth/request_token",
            "https://www.boredatbaker.com/api/v1/oauth/access_token",
            "31324ebdc01f728d820a282ab04d555604fa2ff3f",
            "a0997237fe6e9363407df63eaa05f190",
            "1.0",
            "http://ianww.com:10000/oauth_cb",
            "HMAC-SHA1");

// App

function require_login(req, res, next) {
  if(!req.session.oauth_access_token) {
    req.session.destroy();
    res.redirect("/login"); //?action="+querystring.escape(req.originalUrl));
    return;
  }
  next();
};


app.get('/', require_login, function(req, res) {
  oa.get("http://www.boredatbaker.com/api/v1/posts",
    req.session.oauth_access_token,
    req.session.oauth_access_token_secret,
    function (error, data, response) {
      var feed = JSON.parse(data);
      res.render('index', {
        data: feed,
      });
    });
});

app.get('/oauth_cb', function(req, res) {
  oa.getOAuthAccessToken(
    req.session.oauth_token,
    req.session.oauth_token_secret,
    req.param('oauth_verifier'),
    function(error, oauth_access_token, oauth_access_token_secret, results2) {

      if(error) {
        console.error(error);
        req.session.destroy();
        res.send('There was an error trying to request a token from b@b');
      }
      else {
        // store the access token in the session
        req.session.oauth_access_token = oauth_access_token;
        req.session.oauth_access_token_secret = oauth_access_token_secret;
        res.redirect('/');
      }
    });
});


app.get('/login', function(req, res) {
  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
    if(error) {
      console.error(error);
      req.session.destroy();
      res.send('There was an error talking to the b@b server');
    }
    else {
      // store the tokens in the session
      req.session.oa = oa;
      req.session.oauth_token = oauth_token;
      req.session.oauth_token_secret = oauth_token_secret;

      // redirect the user to authorize the token
      res.redirect("https://www.thoughtposter.com/api/v1/oauth/authorize?oauth_token="+oauth_token);
    }
  })
});

app.get('/posts', require_login, function(req, res) {
});


var port = process.env.PORT || 10000;
app.listen(port);

console.log('Started listening on port 10000');

