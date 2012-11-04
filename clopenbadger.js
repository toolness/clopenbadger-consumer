"use strict";

define(["jquery", "backbone-events"], function($, BackboneEvents) {
  function countUnreadBadges(earned) {
    var unread = 0;
    Object.keys(earned).forEach(function(shortname) {
      if (!earned[shortname].isRead)
        unread++;
    });
    return unread;
  }
  
  function updateunreadBadgeCount(badger) {
    var unreadBadgeCount = countUnreadBadges(badger.earnedBadges);
    if (unreadBadgeCount !== badger.unreadBadgeCount) {
      badger.unreadBadgeCount = unreadBadgeCount;
      badger.trigger("change:unreadBadgeCount");
    }
  }
  
  return function Clopenbadger(options) {
    var server = options.server;
    var token = options.token;
    var email = options.email;
    var self = {
      availableBadges: undefined,
      earnedBadges: undefined,
      unreadBadgeCount: undefined,
      getBadges: function() {
        var badges = [];
        Object.keys(self.availableBadges).forEach(function(shortname) {
          var badge = {};
          var badgeTypeInfo = self.availableBadges[shortname];
          var badgeInstanceInfo = self.earnedBadges[shortname] || {};
          badge.isEarned = (shortname in self.earnedBadges);
          badges.push($.extend(badge, badgeTypeInfo, badgeInstanceInfo));
        });
        return badges;
      },
      markAllBadgesAsRead: function() {
        if (self.unreadBadgeCount == 0)
          return;
        ready.done(function() {
          $.ajax({
            type: 'POST',
            url: server + '/v1/user/mark-all-badges-as-read',
            dataType: 'json',
            data: {
              auth: token,
              email: email
            },
            success: function(data) {
              // TODO: Check for errors.
              if (data.status == "ok") {
                Object.keys(self.earnedBadges).forEach(function(shortname) {
                  self.earnedBadges[shortname].isRead = true;
                });
                updateunreadBadgeCount(self);
                self.trigger("change:earnedBadges");
              }
            }
          });
        });
      },
      credit: function(shortname) {
        ready.done(function() {
          $.ajax({
            type: 'POST',
            url: server + '/v1/user/behavior/' + shortname + '/credit',
            dataType: 'json',
            data: {
              auth: token,
              email: email
            },
            success: function(data) {
              // TODO: Check for errors.
              if (data.status == "awarded") {
                $.extend(self.earnedBadges, data.badges);
                updateunreadBadgeCount(self);
                self.trigger("change:earnedBadges");
                self.trigger("award", Object.keys(data.badges));
              }
            }
          });
        });
      }
    };
    
    BackboneEvents.mixin(self);

    var availableReq = $.getJSON(server + '/v1/badges', function(data) {
      // TODO: Check for errors.
      self.availableBadges = data.badges;
    });

    var earnedReq = $.getJSON(server + '/v1/user', {
      auth: token,
      email: email
    }, function(data) {
      // TODO: Check for errors.
      self.earnedBadges = data.badges;
    });
    
    var ready = $.when(availableReq, earnedReq);

    ready.done(function() {
      updateunreadBadgeCount(self);
      self.trigger("ready");
      self.trigger("change:availableBadges");
      self.trigger("change:earnedBadges");
    }).fail(function() {
      self.trigger("error");
    });
    
    return self;
  };
});
