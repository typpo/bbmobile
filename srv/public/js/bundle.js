$(function(){$(document).bind("mobileinit",function(){$.mobile.buttonMarkup.hoverDelay=0;$.mobile.touchOverflowEnabled=!0});$(".prettydate").prettyDate();setInterval(function(){$(".prettydate").prettyDate()},5E3)});function loadThread(a){$.mobile.changePage("/thread/"+a)}
function prettyDate(a){var a=new Date(a),a=((new Date).getTime()-a.getTime())/1E3,b=Math.floor(a/86400);return isNaN(b)||0>b||31<=b?void 0:0==b&&(60>a&&"just now"||120>a&&"1 minute ago"||3600>a&&Math.floor(a/60)+" minutes ago"||7200>a&&"1 hour ago"||86400>a&&Math.floor(a/3600)+" hours ago")||1==b&&"Yesterday"||7>b&&b+" days ago"||31>b&&Math.ceil(b/7)+" weeks ago"}jQuery.fn.prettyDate=function(){return this.each(function(){var a=prettyDate(this.title);a&&jQuery(this).text(a)})};
