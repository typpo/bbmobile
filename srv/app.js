var express = require('express')
  , gzippo = require('gzippo')
  , fs = require('fs')
  , path = require('path')
  , jade = require('jade')
  , _ = require('underscore')
  , app = express.createServer()
  , OAuth = require('oauth').OAuth
  , redisurl = require('redis-url')
  , secrets = require('./secrets.js')

var API_ENDPOINT = 'www.boredatbaker.com/api/v1/';

//require('./minifier.js').makeBundle();

// Express config
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.cookieParser());
app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());
app.use(gzippo.staticGzip(__dirname + '/public'));

//app.use(express.session({secret: "asdklasl3"}));
var RedisStore = require('connect-redis')(express);
app.use(express.session({secret: "barkbark3. barkbarkbark", store: new RedisStore}));

// Oauth config
var oa = new OAuth('https://' + API_ENDPOINT + 'oauth/request_token',
  'https://' + API_ENDPOINT + 'oauth/access_token',
  secrets.key,
  secrets.secret,
  "1.0",
  "http://www.boredphone.com/oauth_cb",
  "HMAC-SHA1");

// Caching
var redis = redisurl.connect(process.env.REDISTOGO_URL || 'redis://localhost:6379');

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

app.get('/search', require_login, function(req, res) {
  res.render('search');
});

app.get('/search/:query', require_login, function(req, res) {
  getSearch(req, req.params.query, 1, function(feed) {
      res.render('searched', {
        data: feed,
      });
  });
});

app.get('/search/:query/:page.json', require_login, function(req, res) {
  // TODO not working
  getSearch(req, req.params.query, req.params.page, function(feed) {
    res.send(feed);
  });
});

function getSearch(req, query, page, cb) {
  oa.get('http://' + API_ENDPOINT + 'search?q=' + query + '&page=' + page,
    req.session.oauth_access_token,
    req.session.oauth_access_token_secret,
    function (error, data, response) {
      try {
      var feed = JSON.parse(data);
      }
      catch (ex) {
        cb(null);
        return;
      }
      cb(feed);
    });
}

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
        res.redirect('/posts');
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
      // NB manually pointed to thoughtposter right now, because the normal endpoint has a broken SSL cert
      res.redirect("https://www.thoughtposter.com/api/v1/oauth/authorize?oauth_token="+oauth_token);
    }
  })
});

app.get('/posts/since/:since', require_login, function(req, res) {
  getPosts(req, 1, function(feed) {
    var since = parseInt(req.params.since);
    if (since > 0) {
      // Filter out any posts before this timestamp
      // We don't handle deleted posts or anything, because the api isn't conducive to this
      feed = _.filter(feed, function(post) {
        var d = new Date(post.postCreated.replace(' ','T'));
        return d.getTime() > since;
      });
    }

    var changed = {}; // placeholder

    res.send({
      add: feedJSONToHTML(feed),
      changed: changed,
    });
  }, true);   // no cache
});

app.get('/posts', require_login, function(req, res) {
  getPosts(req, 1, function(feed) {
    res.render('index', {
      data: feed,
      reply_context: -1,
    });
  });
});

app.get('/posts/:page.json', require_login, function(req, res) {
  // Used with 'load more' button
  getPosts(req, req.params.page, function(feed) {
    res.send({
      add: feedJSONToHTML(feed),
    });
  });
});

app.post('/posts', require_login, function(req, res) {
  makePost(-1, req, function() {
    getPosts(req, 1, function(feed) {
      res.render('index', {
        data: feed,
        reply_context: -1,
      });
    }, true);  // no cache
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
      // the bug still exists if you navigate further down after making
      // a post, instead of hitting back.
      res.render('thread', context);
    }, true); // no cache
  });
});

app.post('/adn/:verb/:id', require_login, function(req, res) {
  makeADN(req.params.id, req, req.params.verb, function() {
    res.send('ok');
  });
});

function getPosts(req, page, cb, no_cache) {
  var redis_page_key = 'bbmobile:page:' + page;
  function loadPage() {
    console.log('Refreshing cache entry for', redis_page_key);
    oa.get('http://' + API_ENDPOINT + 'posts?page=' + page,
      req.session.oauth_access_token,
      req.session.oauth_access_token_secret,
      function (error, data, response) {
        var feed = JSON.parse(data);
        redis.setex(redis_page_key, 30, data);  // frontpage cached for 30s
        cb(feed);
      });
  }

  if (no_cache) {
    loadPage();
    return;
  }

  redis.get(redis_page_key, function(err, val) {
    if (err || !val) {
      loadPage();
    }
    else {
      console.log('Retrieved', redis_page_key, 'from cache');
      var feed = JSON.parse(val);
      cb(feed);
    }
  });
}

function getThread(id, req, cb, no_cache_replies) {
  var indiv_post, replies;
  var complete = _.after(2, function() {
    // build any links for the post
    if (indiv_post && indiv_post.postText)
      indiv_post.postText = parseAndLinkURLs(indiv_post.postText);

    cb({
      orig: indiv_post,
      replies: replies ? replies : [],
      reply_context: id,
      just_posted: false,
    });
  });

  // Fetch actual post
  var redis_post_key = 'bbmobile:post:' + id;
  redis.get(redis_post_key, function(err, val) {
    if (err || !val) {
      oa.get('http://' + API_ENDPOINT + 'post?id='+id,
        req.session.oauth_access_token,
        req.session.oauth_access_token_secret,
        function (error, data, response) {
          indiv_post = JSON.parse(data);
          if (indiv_post.error)
            indiv_post = null;
          else
            redis.set(redis_post_key, data);
          complete();
        });
    }
    else {
      console.log('Retrieved', redis_post_key, 'from cache');
      indiv_post = JSON.parse(val);
      complete();
    }
  });

  // And fetch replies
  var redis_reply_key = 'bbmobile:replies:' + id;
  function loadReplies() {
    oa.get('http://' + API_ENDPOINT + 'replies?id='+id,
      req.session.oauth_access_token,
      req.session.oauth_access_token_secret,
      function (error, data, response) {
        replies = JSON.parse(data);
        if (replies.error)
          replies = null;
        else
          redis.setex(redis_reply_key, 30, data); // replies cached for 30s
        complete();
      });
  }

  if (no_cache_replies) {
    loadReplies();
  }
  else {
    redis.get(redis_reply_key, function(err, val) {
      if (err || !val) {
        loadReplies();
      }
      else {
        console.log('Retrieved', redis_reply_key, 'from cache');
        replies = JSON.parse(val);
        complete();
      }
    });
  }
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

  oa.post('http://' + API_ENDPOINT + 'post',
    req.session.oauth_access_token,
    req.session.oauth_access_token_secret,
    params,
    function (error, data, response) {
      console.error(data);
      cb();
    });
}

function makeADN(id, req, verb, cb) {
  var params = {
    id: req.params.id,
  };
  oa.post('http://' + API_ENDPOINT + 'post/' + verb,
    req.session.oauth_access_token,
    req.session.oauth_access_token_secret,
    params,
    function (error, data, response) {
      console.error(data);
      cb();

      // invalidate cache
      var redis_post_key = 'bbmobile:post:' + id;
      redis.del(redis_post_key);
    });
}


function feedJSONToHTML(feed) {
  var html = '';
  _.map(feed, function(post) {
    tpl = fs.readFileSync(path.join(__dirname, 'views/post.jade'), 'utf8');
    tpl = jade.compile(tpl, { pretty: false, filename: 'views/post.jade' });
    var addhtml = tpl({ post: post });
    html += addhtml;
  });
  return html;
}

function parseAndLinkURLs(text) {
  var expression = /(^|\s)((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi;
  var regex = new RegExp(expression);

  var res = regex.exec(text);
  if (res && res.length > 0 && res[0]) {
    text = text.replace(res[0], '<a href="' + res[0] + '" rel="external" target="_blank">' + res[0] + '</a>');
  }
  return text;
}


var port = process.env.PORT || 10000;
app.listen(port);

console.log('Started listening on port 10000');
