Verify-PubSub
===========================
## Description
This command line tool aims to verify whether you encounter loss off messges in a pub sub setup.
It checks that all published messages are received by the subscribers
and makes sure, firstly that they're in the correct order and secondly continuous - without loss of messages.

The tool was initially developed for detecting network problems by running it within more complex cloud setups.

In its core, it's database agnostic but has specializations for each database.

Currently supported databases:
- redis

note:
The publisher starts publishing immetiadely. If you don't want to miss any message you might want to
setup the subscribers first.

## Installation
```
npm install verify-pubsub -s
```

## Usage

Publish:
```js
const dbWrapper = require('verify-pubsub');
new dbWrapper({
  database: 'redis',
  host: 'localhost',
  port: '6379' ,
  password: 'somePassword',
  progresss: true
}, (db) => {
  // key, interval
  db.startPublish('someKey', 5);
});
```

Subscribe:

```js
const dbWrapper = require('verify-pubsub');
new dbWrapper({
  database: 'redis',
  host: 'localhost',
  port: '6379' ,
  password: 'somePassword',
  progress: true
}, (db) => {
  db.startSubscribe('someKey');
});
```

---

## License

Copyright (c) 2018 Robin Fehr

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
