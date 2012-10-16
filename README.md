This is a consumer library for the [Clopenbadger API][] that can be used from
Webmaker Applications to display earned & available badges for users, as
well as credit user behaviors.

## Prerequisites

All prerequisites are contained in the `vendor` directory.

Currently this library needs [requirejs][], jquery, and a special
module called `backbone-events`, which simply contains the [Backbone.Events][]
implementation. If your project already uses Backbone, you can use a 
[much smaller version][smaller-events] of the library, or you can create
your own shim that uses your own eventing library as an implementation.

## Usage

For examples of this library in use, see `test/all-tests.js`.

  [Clopenbadger API]: https://github.com/mozilla/clopenbadger/wiki/API
  [requirejs]: http:///requirejs.org/
  [Backbone.Events]: http://documentcloud.github.com/backbone/#Events
  [smaller-events]: https://github.com/mozilla/friendlycode/blob/gh-pages/js/backbone-events.js
