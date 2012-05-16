var express = require('express')
  , fs = require('fs')
  , path = require('path')
  , jade = require('jade')
  , _ = require('underscore')
  , app = express.createServer()
  , OAuth = require('oauth').OAuth
  , secrets = require('./secrets.js')

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
            secrets.key,
            secrets.secret,
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

function getThread(id, req, cb) {
  var indiv_post, replies;
  var complete = _.after(2, function() {
    cb({
      orig: indiv_post,
      replies: replies ? replies : [],
      reply_context: id,
      just_posted: false,
    });
  });

  // Fetch actual post
  oa.get("http://www.boredatbaker.com/api/v1/post?id="+id,
    req.session.oauth_access_token,
    req.session.oauth_access_token_secret,
    function (error, data, response) {
      indiv_post = JSON.parse(data);
      if (indiv_post.error)
        indiv_post = null;
      complete();
    });

  // And fetch replies
  oa.get("http://www.boredatbaker.com/api/v1/replies?id="+id,
    req.session.oauth_access_token,
    req.session.oauth_access_token_secret,
    function (error, data, response) {
      replies = JSON.parse(data);
      if (replies.error)
        replies = null;
      complete();
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

app.post('/posts', require_login, function(req, res) {
  makePost(-1, req, function() {
    getPosts(req, function(feed) {
      res.render('index', {
        data: feed,
        reply_context: -1,
      });
    });
  });
});


app.get('/thread/:id', require_login, function(req, res) {
  getThread(req.params.id, req, function(context) {
    res.render('thread', context);
  });
});

app.post('/thread/:id', require_login, function(req, res) {
  var id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.send('');
    return;
  }
  makePost(id, req, function() {
    getThread(id, req, function(context) {
      context.just_posted = true; // so back button works correctly
      res.render('thread', context);
    });
  });
});

app.post('/agree/:id', require_login, function(req, res) {
  makeADN(req.params.id, req, 'agree', function() {
    res.send('ok');
  });
});

app.post('/disagree/:id', require_login, function(req, res) {
  makeADN(req.params.id, req, 'disagree', function() {
    res.send('ok');
  });

});

app.post('/newsworthy/:id', require_login, function(req, res) {
  makeADN(req.params.id, req, 'newsworthy', function() {
    res.send('ok');
  });
});

function makeADN(id, req, verb, cb) {
  var params = {
    id: req.params.id,
  };
  oa.post("http://www.boredatbaker.com/api/v1/post/agree",
    req.session.oauth_access_token,
    req.session.oauth_access_token_secret,
    params,
    function (error, data, response) {
      console.error(data);
      cb();
    });
}

function makePost(id, req, cb) {
  if (!req.body.text) {
    cb();
    return;
  }

  var params = {
    text: req.body.text,
    anonymously: 1,
  };
  if (id > -1) params.id = id;

  oa.post("http://www.boredatbaker.com/api/v1/post",
    req.session.oauth_access_token,
    req.session.oauth_access_token_secret,
    params,
    function (error, data, response) {
      console.error(data);
      cb();
    });
}

var port = process.env.PORT || 10000;
app.listen(port);

console.log('Started listening on port 10000');
