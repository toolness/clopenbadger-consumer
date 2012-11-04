"use strict";

defineTests([
  "jquery",
  "test/fake-clopenbadger-server",
  "clopenbadger"
], function($, Server, Clopenbadger) {
  var badger;
  var fakeServerURL = "http://clopenbadger";
  var availableBadges = {
    "FIRST_LOGIN": {
      "name": "First Login",
      "description": "Like a champion, you logged in...",
      "criteria": "Can log into a site that uses Persona for auth.",
      "image": "https://wiki.mozilla.org/images/b/bb/Merit-badge.png",
      "behaviors": [
        {"name": "LOGGED_IN", "score": 1}
      ],
      "prerequisites": []
    }
  };

  module("clopenbadger", {
    setup: function() {
      Server.setup({
        urlPrefix: fakeServerURL,
        availableBadges: availableBadges,
        parseToken: true,
        time: 12345
      });
      badger = Clopenbadger({
        server: fakeServerURL,
        token: JSON.stringify({prn: "foo@bar.org"}),
        email: "foo@bar.org"
      });
    }
  });

  asyncTest("change:unreadBadgeCount is broadcast on init", function() {
    badger.on('change:unreadBadgeCount', function() {
      equal(badger.unreadBadgeCount, 0,
            "badger.unreadBadgeCount matches our expectations");
      start();
    });
  });
  
  asyncTest("change:availableBadges is broadcast on init", function() {
    badger.on('change:availableBadges', function() {
      deepEqual(badger.availableBadges, availableBadges,
                "badger.availableBadges matches our expectations");
      start();
    });
  });
  
  asyncTest("change:earnedBadges is broadcast on init", function() {
    var available = false;
    badger.on('change:availableBadges', function() { available = true; });
    badger.on('change:earnedBadges', function() {
      ok(available, "change:availableBadges is always triggered first");
      deepEqual(badger.earnedBadges, {},
                "badger.earnedBadges matches our expectations");
      start();
    });
  });
  
  asyncTest("markAllBadgesAsRead() changes unreadBadgeCount", function() {
    var unread = false;
    Server.flushResponses();
    badger.on('award', function(badges) {
      equal(badger.unreadBadgeCount, 1, "unreadBadgeCount is 1");
      badger.on('change:unreadBadgeCount', function() {
        unread = true;
        equal(badger.unreadBadgeCount, 0, "unreadBadgeCount is cleared");
      });
      badger.on('change:earnedBadges', function() {
        ok(unread,
           "change:unreadBadgeCount triggered before changed:earnedBadges");
        start();
      });
      badger.markAllBadgesAsRead();
    });
    badger.credit('LOGGED_IN');
  });
  
  asyncTest("award is broadcast", function() {
    var earned = false;
    var unread = false;
    Server.flushResponses();
    ok(!("FIRST_LOGIN" in badger.earnedBadges),
       "badger.earnedBadges does not contain the FIRST_LOGIN badge");
    badger.on('change:unreadBadgeCount', function() {
      unread = true;
      equal(badger.unreadBadgeCount, 1, "badger.unreadBadgeCount is 1");
    });
    badger.on('change:earnedBadges', function() {
      ok(unread,
         "change:unreadBadgeCount triggered before changed:earnedBadges");
      ok("FIRST_LOGIN" in badger.earnedBadges,
         "badger.earnedBadges contains the FIRST_LOGIN badge");
      earned = true;
    });
    badger.on('award', function(badges) {
      ok(earned, "changed:earnedBadges triggered before award");
      deepEqual(badges, ["FIRST_LOGIN"], "event param has earned badges");
      equal(Server.behaviors.LOGGED_IN, 1, "LOGGED_IN behavior credited");
      deepEqual(badger.earnedBadges["FIRST_LOGIN"], {
        issuedOn: 12345,
        assertionUrl: "http://clopenbadger/foo@bar.org/FIRST_LOGIN",
        isRead: false
      }, "badger.earnedBadges['FIRST_LOGIN'] matches expectations");
      start();
    });
    badger.credit('LOGGED_IN');
  });

  test("error event is not fired on ready success", function() {
    badger.on("error", function() { ok(false, "error event fired"); });
    badger.on("ready", function() { ok(true, "ready event fired"); });
    Server.flushResponses();
  });
  
  test("error event is fired on ready failure", function() {
    Server.modifyQueuedResponses(function(info) {
      if (info.path == '/v1/badges') {
        info.response.status = 500;
        info.response.statusText = "Internal Server Error";
      }
    });
    badger.on("error", function() { ok(true, "error event fired"); });
    badger.on("ready", function() { ok(false, "ready event fired"); });
    Server.flushResponses();
  });
  
  test("getBadges() works for unearned badges", function() {
    Server.flushResponses();
    deepEqual(badger.getBadges(), [{
      "behaviors": [{"name": "LOGGED_IN", "score": 1}],
      "criteria": "Can log into a site that uses Persona for auth.",
      "description": "Like a champion, you logged in...",
      "image": "https://wiki.mozilla.org/images/b/bb/Merit-badge.png",
      "name": "First Login",
      "prerequisites": [],
      "isEarned": false
    }]);
  });
  
  test("getBadges() works for earned badges", function() {
    badger.credit("LOGGED_IN");
    Server.flushResponses();
    deepEqual(badger.getBadges(), [{
      "behaviors": [{"name": "LOGGED_IN", "score": 1}],
      "criteria": "Can log into a site that uses Persona for auth.",
      "description": "Like a champion, you logged in...",
      "image": "https://wiki.mozilla.org/images/b/bb/Merit-badge.png",
      "name": "First Login",
      "prerequisites": [],
      "isEarned": true,
      "issuedOn": 12345,
      "isRead": false,
      "assertionUrl": "http://clopenbadger/foo@bar.org/FIRST_LOGIN",
    }]);
  });
});
