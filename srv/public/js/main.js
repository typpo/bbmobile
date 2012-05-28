$(document).bind("mobileinit", function(){
  $.mobile.buttonMarkup.hoverDelay = 0;
  $.mobile.touchOverflowEnabled = true;
});

$(function() {
  $('.prettydate').prettyDate();
  setInterval(function() {
    $('.prettydate').prettyDate();
  }, 5000);

  var lastUpdated = new Date().getTime();
  setInterval(function() {
    $.getJSON('/posts/since/' + lastUpdated, function(data) {
      $(data.add).hide().prependTo('#posts').fadeIn();
      $('#posts').listview('refresh');
      $('.prettydate').prettyDate();
    });
    lastUpdated = new Date().getTime();
  }, 30000);
});

function loadThread(id) {
  // performance workaround
  $.mobile.changePage('/thread/' + id);
  mixpanel.track('thread');
}

function adn(verb, id) {
  $.mobile.showPageLoadingMsg('show');
  $.post('/adn/' + verb + '/' + id, {}, function(data) {
    // fake it
    $.mobile.hidePageLoadingMsg('hide');
    var $e = $('#num-' + verb);
    $e.html(parseInt($e.html()) + 1);
  }, 'text');
  mixpanel.track('adn');
}

var page = 1;
function loadMore() {
  $('#loadmore').hide();
  ++page;
  $.mobile.showPageLoadingMsg('show');
  $.getJSON('/posts/' + page + '.json', function(data) {
    $(data.add).hide().appendTo('#posts').fadeIn();
    $('#posts').listview('refresh');
    $('.prettydate').prettyDate();
    $('#loadmore').show();
    $.mobile.hidePageLoadingMsg('hide');
    $(document).scrollTop($(document).scrollTop() + 100);
  });
  mixpanel.track('more');
}

function loadMoreSearch() {
  $('#loadmore').hide();
  ++page;
  $.mobile.showPageLoadingMsg('show');
  $.getJSON('/search/' + page + '.json', function(data) {
    $(data.add).hide().appendTo('#posts').fadeIn();
    $('#posts').listview('refresh');
    $('.prettydate').prettyDate();
    $('#loadmore').show();
    $.mobile.hidePageLoadingMsg('hide');
    $(document).scrollTop($(document).scrollTop() + 100);
  });
  mixpanel.track('more search');
}

/*
 * JavaScript Pretty Date
 * Copyright (c) 2011 John Resig (ejohn.org)
 * Licensed under the MIT and GPL licenses.
 */

// Takes an ISO time and returns a string representing how
// long ago the date represents.
function prettyDate(time){
  var date = new Date(time),
    diff = (((new Date()).getTime() - date.getTime()) / 1000),
    day_diff = Math.floor(diff / 86400);
  if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
    return;

  return day_diff == 0 && (
      diff < 60 && "just now" ||
      diff < 120 && "1 minute ago" ||
      diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
      diff < 7200 && "1 hour ago" ||
      diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
    day_diff == 1 && "Yesterday" ||
    day_diff < 7 && day_diff + " days ago" ||
    day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
}

// If jQuery is included in the page, adds a jQuery plugin to handle it as well
jQuery.fn.prettyDate = function(){
  return this.each(function(){
    var date = prettyDate(this.title);
    if (date)
      jQuery(this).text( date );
  });
};
