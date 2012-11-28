This is a tiny, event-driven interface to the [Clopenbadger API][] that
can be used from Webmaker Applications to display earned & available badges 
for users, as well as credit user behaviors.

## Prerequisites

All prerequisites are contained in the `vendor` directory.

Currently this library needs [requirejs][], jquery, and a special
module called `backbone-events`, which simply contains the [Backbone.Events][]
implementation. If your project already uses Backbone, you can use a 
[much smaller version][smaller-events] of the library, or you can create
your own shim that uses your own eventing library as an implementation.

Optionally, this library supports the [postmessage-proxied-xhr][PPX] (PPX)
library to allow browsers without CORS support to communicate with
a Clopenbadger server on a different origin.

## Usage

For any details not specified by the following documentation, see 
the test suite at `test/all-tests.js` for more information.

### Construction

Create a Clopenbadger instance like this:

```javascript
var badger = Clopenbadger(options);
```

`options` is an object with the following keys:

* `server` - The URL to the server that hosts a Clopenbadger API, e.g. 
  `http://foo.org`. It should *not* have a `/` at the end.

* `token`: The JSON Web Token to authenticate with the Clopenbadger
  server. Construction of this token is explained in the
  [Clopenbadger API][] documentation.
  
* `email`: The email address of the user that badge operations will
  be for.

### Events

A Clopenbadger instance emits the following events:

* `ready` - Emitted once the Clopenbadger server has been contacted
  and initial metadata about available badges and earned badges
  has been retrieved. Mutually exclusive with the `error` event.

* `error` - Emitted when an initialization error occurs. Mutually
  exclusive with the `ready` event.
  
* `change:availableBadges` - Emitted when metadata about available
  badges has changed.
  
* `change:earnedBadges` - Emitted when metadata about the current
  user's earned badges has changed.
  
* `change:unreadBadgeCount` - Emitted when the number of new badges
  a user hasn't seen yet has changed.
  
* `award` - Emitted when one or more badges have been awarded to
  the user. The single argument passed is an array of shortnames
  of the badges that have been awarded.

### Methods

A Clopenbadger instance has the following methods:

* `credit(shortname)` - Credits the behavior with the given shortname
  to the user. If a badge is awarded as a result of the credit, an
  `award` event is triggered.
  
* `markAllBadgesAsRead()` - Marks all the user's badges as read (i.e.,
  seen by the user). If the number of unread badges has changed as
  a result of this call, a `change:unreadBadgeCount` event is triggered.

* `getBadges()` - Returns an array of objects containing combined
  metadata about badge types and issuance (if any) for the current user.

### Properties

All of the following properties are read-only.

* `unreadBadgeCount` - The number of unread badges that the user has.

* `availableBadges` - An object mapping badge shortnames to their
  metadata. Information about issuance is not contained here.

* `earnedBadges` - An object mapping earned badge shortnames to their
  issuance metadata.

## Testing

The module at `test/fake-clopenbadger-server.js` provides a class that uses
[jQuery Ajax Transport][ajaxTransport] middleware to run a fake
Clopenbadger "server" in the embedding webpage and return fake
responses. This is used by Clopenbadger's test suite, but may also be
useful for testing your own code.

  [PPX]: https://github.com/toolness/postmessage-proxied-xhr
  [Clopenbadger API]: https://github.com/mozilla/clopenbadger/wiki/API
  [requirejs]: http:///requirejs.org/
  [Backbone.Events]: http://documentcloud.github.com/backbone/#Events
  [smaller-events]: https://github.com/mozilla/friendlycode/blob/gh-pages/js/backbone-events.js
  [ajaxTransport]: http://api.jquery.com/extending-ajax/#Transports
