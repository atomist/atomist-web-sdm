<p align="center">
  <img src="https://images.atomist.com/sdm/SDM-Logo-Dark.png">
</p>

# @atomist/atomist-web-sdm

[![npm version](https://img.shields.io/npm/v/@atomist/atomist-web-sdm.svg)](https://www.npmjs.com/package/@atomist/atomist-web-sdm)
[![docker pulls](https://img.shields.io/docker/pulls/atomist/atomist-web-sdm.svg)](https://hub.docker.com/r/atomist/atomist-web-sdm)
[![release](https://img.shields.io/github/release/atomist/atomist-web-sdm.svg)](https://github.com/atomist/atomist-web-sdm/releases/latest)

The Atomist software delivery machine (SDM) that delivers
[Atomist][atomist] web projects.

Software delivery machines enable you to control your delivery process
in code.  Think of it as an API for your software delivery.  See the
[Atomist documentation][atomist-doc] for more information on the
concept of a software delivery machine and how to create and develop
an SDM.

[atomist-doc]: https://docs.atomist.com/ (Atomist Documentation)

## Getting started

See the [Developer Quick Start][atomist-quick] to jump straight to
creating an SDM.

[atomist-quick]: https://docs.atomist.com/quick-start/ (Atomist - Developer Quick Start)

## Contributing

Contributions to this project from community members are encouraged
and appreciated. Please review the [Contributing
Guidelines](CONTRIBUTING.md) for more information. Also see the
[Development](#development) section in this document.

## Code of conduct

This project is governed by the [Code of
Conduct](CODE_OF_CONDUCT.md). You are expected to act in accordance
with this code by participating. Please report any unacceptable
behavior to code-of-conduct@atomist.com.

## Documentation

Please see [docs.atomist.com][atomist-doc] for
[developer][atomist-doc-sdm] documentation.

[atomist-doc-sdm]: https://docs.atomist.com/developer/sdm/ (Atomist Documentation - SDM Developer)

## Connect

Follow [@atomist][atomist-twitter] and [the Atomist blog][atomist-blog].

[atomist-twitter]: https://twitter.com/atomist (Atomist on Twitter)
[atomist-blog]: https://blog.atomist.com/ (The Official Atomist Blog)

## Support

General support questions should be discussed in the `#help`
channel in the [Atomist community Slack workspace][slack].

If you find a problem, please create an [issue][].

[issue]: https://github.com/atomist/atomist-web-sdm/issues

## Development

You will need to install [Node.js][node] to build and test this
project.

[node]: https://nodejs.org/ (Node.js)

### Build and test

Install dependencies.

```
$ npm install
```

Use the `build` package script to compile, test, lint, and build the
documentation.

```
$ npm run build
```

### Release

Releases are handled via the [Atomist Client SDM][atomist-client-sdm].  Just press
the 'Approve' button in the Atomist dashboard or Slack.

[atomist-client-sdm]: https://github.com/atomist/atomist-client-sdm (Atomist Client Software Delivery Machine)

---

Created by [Atomist][atomist].
Need Help?  [Join our Slack workspace][slack].

[atomist]: https://atomist.com/ (Atomist - How Teams Deliver Software)
[slack]: https://join.atomist.com/ (Atomist Community Slack)
