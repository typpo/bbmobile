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
app.use(express.session({
    secret: "asdklasl3"
}));

// App

app.get('/', function(req, res) {
  res.render('index', {

  });
});

var port = process.env.PORT || 8080;
app.listen(port);

console.log('Started listening on port 8080');



(function login(){

  var getRequestTokenUrl = "https://www.boredatbaker.com/api/v1/oauth/request_token";


  var oa = new OAuth(getRequestTokenUrl,
                    "https://www.boredatbaker.com/api/v1/oauth/request_token",
                    "31324ebdc01f728d820a282ab04d555604fa2ff3f",
                    "a0997237fe6e9363407df63eaa05f190",
                    "1.0",
                    "", //"http://localhost:3000/google_cb"+( req.param('action') && req.param('action') != "" ? "?action="+querystring.escape(req.param('action')) : "" ),
                    "HMAC-SHA1");

  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
    if(error) {
      console.log('error');
      console.log(error);
    }
    else {
      console.log('tokenz ', oauth_token, oauth_token_secret, results);


      oa.getOAuthAccessToken(
        oauth_token,
        oauth_token_secret,
        req.param('oauth_verifier'),
        function(error, oauth_access_token, oauth_access_token_secret, results2) {

          if(error) {
            console.log('error');
            console.log(error);
          }
          else {

            // store the access token in the session
            req.session.oauth_access_token = oauth_access_token;
            req.session.oauth_access_token_secret = oauth_access_token_secret;

            res.redirect((req.param('action') && req.param('action') != "") ? req.param('action') : "/google_contacts");
          }

        });

        oa.getProtectedResource(
          "http://www.boredatbaker.com/api/v1/posts",
          "GET",
          oauth_token,
          oauth_token_secret,
          function (error, data, response) {

            var feed = JSON.parse(data);
            console.log(feed);

          });

          return;
          // store the tokens in the session
/*
        req.session.oa = oa;
        req.session.oauth_token = oauth_token;
        req.session.oauth_token_secret = oauth_token_secret;

        // redirect the user to authorize the token
        res.redirect("https://www.bored.com/accounts/OAuthAuthorizeToken?oauth_token="+oauth_token);
*/
    }
  })

})();
