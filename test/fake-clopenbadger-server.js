"use strict";

define(["jquery"], function($) {
  function copyObject(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  
  function getBadgesToAward(available, earned, behaviors) {
    var awards = [];
    Object.keys(available).forEach(function(badgeName) {
      var badge = available[badgeName];
      if (badgeName in earned)
        return;
      for (var i = 0; i < badge.behaviors.length; i++) {
        var info = badge.behaviors[i];
        if (!(info.name in behaviors) || behaviors[info.name] < info.score)
          return;
      }
      awards.push(badgeName);
    });
    return awards;
  }
  
  function logExceptions(fn) {
    return function() {
      try {
        return fn.apply(this, arguments);
      } catch (e) {
        if (window.console)
          console.log(e.toString());
        throw e;
      }
    };
  }
  
  var transport = function() {};
  var queuedResponses = [];
  var flushResponsesTimeout;
  
  // http://api.jquery.com/extending-ajax/#Transports
  $.ajaxTransport("+*", function(options, originalOptions, jqXHR) {
    return transport(options, originalOptions, jqXHR);
  });
  
  var self = {
    responseTime: 0,
    availableBadges: {},
    earnedBadges: {},
    behaviors: {},
    modifyQueuedResponses: function(cb) {
      queuedResponses.forEach(cb);
    },
    flushResponses: function() {
      while (queuedResponses.length) {
        var responses = queuedResponses;
        queuedResponses = [];
        clearTimeout(flushResponsesTimeout);
        responses.forEach(function(info) {
          var r = info.response;
          info.callback(r.status, r.statusText, r.responses, r.headers);
        });
      }
    },
    setup: function setup(options) {
      var urlPrefix = options.urlPrefix;
      var availableBadges = options.availableBadges || {};
      var behaviors = options.behaviors || {};
      var earnedBadges = options.earnedBadges || {};
      var parseToken = options.parseToken || false;

      this.time = options.time;
      this.availableBadges = availableBadges;
      this.behaviors = behaviors;
      this.earnedBadges = earnedBadges;
      
      transport = function(options, originalOptions, jqXHR) {
        if (options.url.indexOf(urlPrefix) != 0)
          return;

        var path = originalOptions.url.slice(urlPrefix.length);
        var authInfo = {prn: ""};

        if (window.console)
          console.log(options.type, options.url);
        if (parseToken && originalOptions.data &&
            originalOptions.data.auth)
          authInfo = JSON.parse(originalOptions.data.auth);
        return {
          send: logExceptions(function(headers, completeCallback) {
            function respond(status, statusText, responses, headers) {
              queuedResponses.push({
                callback: completeCallback,
                path: path,
                options: options,
                originalOptions: originalOptions,
                response: {
                  status: status,
                  statusText: statusText,
                  responses: responses,
                  headers: headers
                }
              });
              clearTimeout(flushResponsesTimeout);
              flushResponsesTimeout = setTimeout(self.flushResponses,
                                                 self.responseTime);
            }
            
            function respondWithJSON(obj, status, statusText) {
              status = status || 200;
              statusText = statusText || "OK";
              return respond(status, statusText, {json: copyObject(obj)}, {
                'content-type': 'application/json'
              });
            }
            
            if (options.type == "GET") {
              if (path == "/v1/badges") {
                return respondWithJSON({
                  status: "ok",
                  badges: availableBadges
                });
              } else if (path == "/v1/user") {
                if (parseToken && authInfo.prn != originalOptions.data.email)
                  throw new Error("email param != JWT claim set principal");
                return respondWithJSON({
                  status: "ok",
                  behaviors: behaviors,
                  badges: earnedBadges
                });
              }
            } else if (options.type == "POST") {
              if (parseToken && authInfo.prn != originalOptions.data.email)
                throw new Error("email param != JWT claim set principal");

              if (path == "/v1/user/mark-all-badges-as-read") {
                Object.keys(earnedBadges).forEach(function(shortname) {
                  earnedBadges[shortname].isRead = true;
                });
                return respondWithJSON({status: "ok"});
              }

              var shortnameRegexp = /^\/v1\/user\/behavior\/(.*)\/credit$/;
              var creditMatch = path.match(shortnameRegexp);
              if (creditMatch) {
                var shortname = creditMatch[1];
                if (!behaviors[shortname])
                  behaviors[shortname] = 0;
                behaviors[shortname]++;
                var awards = getBadgesToAward(availableBadges, earnedBadges,
                                              behaviors);
                if (awards.length) {
                  var awardedBadges = {};
                  awards.forEach(function(badgeName) {
                    earnedBadges[badgeName] = awardedBadges[badgeName] = {
                      issuedOn: self.time || Math.floor(Date.now() / 1000),
                      assertionUrl: urlPrefix + "/" +
                                    originalOptions.data.email + "/" +
                                    badgeName,
                      isRead: false
                    };
                  });
                  return respondWithJSON({
                    status: "awarded",
                    badges: awardedBadges
                  }, 201, "Created");
                } else
                  return respondWithJSON({
                    status: "ok"
                  });
              }
            }
            
            return respond(404, "Not Found", {
              text: "Not found: " + path
            }, {
              'content-type': 'text/plain'
            });
          }),
          abort: function() {
            throw new Error("abort() is not implemented!");
          }
        };
      };
    }
  };
  
  return self;
});
