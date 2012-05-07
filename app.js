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

// App

app.get('/', function(req, res) {
  res.render('index', {

  });
});

app.get('/oauth_cb', function(req, res) {
  var oa = new OAuth(req.session.oa._requestUrl,
                    req.session.oa._accessUrl,
                    req.session.oa._consumerKey,
                    req.session.oa._consumerSecret,
                    req.session.oa._version,
                    req.session.oa._authorize_callback,
                    req.session.oa._signatureMethod);

                    console.log(req.session.oauth_token, req.session.oauth_token_secret);

  oa.getOAuthAccessToken(
    req.session.oauth_token,
    req.session.oauth_token_secret,
    req.param('oauth_verifier'),
    function(error, oauth_access_token, oauth_access_token_secret, results2) {

      if(error) {
        console.error(error);
      }
      else {
        // store the access token in the session
        console.log(error, oauth_access_token, oauth_access_token_secret, results2)
        req.session.oauth_access_token = oauth_access_token;
        req.session.oauth_access_token_secret = oauth_access_token_secret;

        res.send('good');
      }
    });
});


app.get('/l', function(req, res) {
  var getRequestTokenUrl = "https://www.boredatbaker.com/api/v1/oauth/request_token";


  var oa = new OAuth(getRequestTokenUrl,
                    "https://www.boredatbaker.com/api/v1/oauth/access_token",
                    "31324ebdc01f728d820a282ab04d555604fa2ff3f",
                    "a0997237fe6e9363407df63eaa05f190",
                    "1.0",
                    "http://ianww.com:10000/oauth_cb",
                    "HMAC-SHA1");

  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
    if(error) {
      console.error(error);
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

app.get('/posts', function(req, res) {
  console.log('loading psts');
  var oa = new OAuth(req.session.oa._requestUrl,
                    req.session.oa._accessUrl,
                    req.session.oa._consumerKey,
                    req.session.oa._consumerSecret,
                    req.session.oa._version,
                    req.session.oa._authorize_callback,
                    req.session.oa._signatureMethod);

  console.log(oa);
  console.log(req.session);

  oa.get("http://www.boredatbaker.com/api/v1/posts",
    req.session.oauth_access_token,
    req.session.oauth_access_token_secret,
    function (error, data, response) {

      var feed = JSON.parse(data);

      res.send(feed);

    });
});


var port = process.env.PORT || 10000;
app.listen(port);

console.log('Started listening on port 10000');

