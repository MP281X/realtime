# @mp281x/realtime

A library designed to handle server-sent events (SSE) with full type-safety in SvelteKit and Next.js.

## Features

- Full type-safety for client and frontend
- Simplified management of server-sent events.
- Seamless integration with SvelteKit and Next.js.

## Installation

```sh
npm install @mp281x/realtime
```

## Usage

- run the CLI to generate the types
- replace the {rootDir} with the path (or the alias) to the root directory

### CLI

Before using this package you need to run the integrated CLI to generate the types for the current project.

- the types needs to be regenerated only when a new endpoint is added or removed
- you don't need to regenerate the types if you only change the type of one of the endpoints

The easiest way to run it is to put the command before the dev or build script like this:

```json
{
	"scripts": {
		"dev": "realtime && pnpm next dev --turbo",
		"build": "realtime && pnpm next build"
	}
}
```

### Server

- sveltekit: +server.ts
- next.js: route.ts

```ts
import { sseServer } from '{rootDir}/sse.g.ts'

export const GET = sseServer(async function* () {
	for (let i = 0; true; i += 1) {
		yield { value: i }
		await new Promise(r => setTimeout(r, 100))
	}
})
```

### Client

```ts
import { sseClient } from '{rootDir}/sse.g.ts'

// Replace '/...' with your endpoint (the endpoints are typed)
sseClient('/...', x => console.log(x))
```
