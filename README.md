# Squid CLI (`sqd`)

[![npm version](https://badge.fury.io/js/@subsquid%2Fcli.svg)](https://www.npmjs.com/package/@subsquid/cli)

`@subsquid/cli` is the command line tool for building and deploying Squid SDK blockchain indexers. It installs a single `sqd` binary that scaffolds a new squid project, runs it locally, and deploys and manages squids in [SQD Cloud](https://docs.sqd.dev/en/cloud).

It is part of [SQD](https://sqd.dev), an open data platform for Web3. A squid is an indexer built with the Squid SDK that extracts onchain data into a queryable store.

## Installation

Install the CLI globally with npm:

```bash
npm i -g @subsquid/cli
```

This adds the `sqd` command to your `PATH`. Check the version with:

```bash
sqd --version
```

## Usage

Run `sqd --help` to list all commands, or `sqd <command> --help` for the flags and examples of a specific command.

A typical workflow:

```bash
# Scaffold a new squid project from a template or GitHub repo
sqd init my-squid

# Run a squid project locally
sqd run .

# Log in to SQD Cloud with an API key
sqd auth -k <your-api-key>

# Deploy a new squid or update an existing one in the Cloud
sqd deploy .
```

## Commands

The CLI is built with [oclif](https://oclif.io). The commands below come from the source in `src/commands`.

| Command | Description |
| --- | --- |
| `sqd init` | Set up a new squid project from a template or GitHub repo |
| `sqd run` | Run a squid project locally |
| `sqd auth` | Log in to the Cloud |
| `sqd whoami` | Show the user details for the current Cloud account |
| `sqd deploy` | Deploy a new or update an existing squid in the Cloud |
| `sqd list` | List squids deployed to the Cloud |
| `sqd view` | View information about a squid |
| `sqd logs` | Fetch logs from a squid deployed to the Cloud |
| `sqd restart` | Restart a squid deployed to the Cloud |
| `sqd remove` (`rm`) | Remove a squid deployed to the Cloud |
| `sqd prod` | Assign the canonical production API alias for a squid in the Cloud |
| `sqd explorer` | Open a visual explorer for Cloud deployments |
| `sqd docs` | Open the docs in a browser |
| `sqd tags add` / `tags remove` | Add or remove a tag on a squid |
| `sqd secrets set` / `secrets list` / `secrets remove` | Manage organization secrets in the Cloud |
| `sqd gateways list` | List available gateways (data sources for a squid) |
| `sqd profiles use` / `profiles list` / `profiles remove` | Manage saved CLI profiles |

## Documentation

- CLI reference: https://docs.sqd.dev/squid-cli/
- SQD Cloud: https://docs.sqd.dev/en/cloud
- Squid SDK: https://docs.sqd.dev/en/sdk

## License

GPL-3.0-or-later. See `package.json` for details.
