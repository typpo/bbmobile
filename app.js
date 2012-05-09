var express = require('express')
  , fs = require('fs')
  , path = require('path')
  , jade = require('jade')
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
//app.use(express.session({secret: "asdklasl3"}));
var RedisStore = require('connect-redis')(express);
app.use(express.session({secret: "barkbark3. barkbarkbark", store: new RedisStore}));

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
  res.redirect('/posts');
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

function getPosts(req, cb) {
  oa.get("http://www.boredatbaker.com/api/v1/posts",
    req.session.oauth_access_token,
    req.session.oauth_access_token_secret,
    function (error, data, response) {
      var feed = JSON.parse(data);
      cb(feed);
    });
}

app.get('/posts/since/:since', require_login, function(req, res) {
  getPosts(req, function(feed) {
    var since = parseInt(req.params.since);
    if (since > 0) {
      // Filter out any posts before this timestamp
      // We don't handle deleted posts or anything, because the api isn't conducive to this
      feed = _.filter(feed, function(post) {
        var d = new Date(post.postCreated.replace(' ','T'));
        return d.getTime() > since;
      });
    }

    var html = '';
    _.map(feed, function(post) {
      tpl = fs.readFileSync(path.join(__dirname, 'views/post.jade'), 'utf8');
      tpl = jade.compile(tpl, { pretty: false, filename: 'views/post.jade' });
      var addhtml = tpl({ post: post });
      html += addhtml;
    });

    var changed = {};
    // TODO need to find any changes..

    res.send({
      add: html,
      changed: changed,
    });
  });
});

app.get('/posts', require_login, function(req, res) {
  getPosts(req, function(feed) {
    res.render('index', {
      data: feed,
      reply_context: -1,
    });
  });
});


app.get('/thread/:id', require_login, function(req, res) {

  var indiv_post, replies;
  var complete = _.after(2, function() {
    res.render('thread', {
      orig: indiv_post,
      // TODO replies API is broken
      replies: replies ? [replies] : [],
      reply_context: req.params.id,
    });
  });

  // Fetch actual post
  oa.get("http://www.boredatbaker.com/api/v1/post?id="+req.params.id,
    req.session.oauth_access_token,
    req.session.oauth_access_token_secret,
    function (error, data, response) {
      indiv_post = JSON.parse(data);
      if (indiv_post.error)
        indiv_post = null;
      complete();
    });

  // And fetch replies
  oa.get("http://www.boredatbaker.com/api/v1/replies?id="+req.params.id,
    req.session.oauth_access_token,
    req.session.oauth_access_token_secret,
    function (error, data, response) {
      console.log(data, response);
      replies = JSON.parse(data);
      if (replies.error)
        replies = null;
      complete();
    });
});

app.get('/thread/:id', require_login, function(req, res) {

});

app.post('/agree/:id', require_login, function(req, res) {

});
app.post('/disagree/:id', require_login, function(req, res) {

});
app.post('/newsworthy/:id', require_login, function(req, res) {

});

app.post('/write/:id', require_login, function(req, res) {

});

var port = process.env.PORT || 10000;
app.listen(port);

console.log('Started listening on port 10000');

