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

### CLI

Before using this package you need to run the integrated CLI to generate the types for the current project.

- the types needs to be regenerated only when a new endpoint is added or removed
- you don't need to regenerate the types if you only change the type of one of the endpoints

The easiest way to run it is to configure the project like this:

#### package.json

```json
{
	"scripts": {
		"dev": "realtime && pnpm next dev --turbo",
		"build": "realtime && pnpm next build"
	}
}
```

#### tsconfig.json

```json
{
    ...
	"include": ["sse.g.ts", ...]
}
```

### Server

- sveltekit: +server.ts
- next.js: route.ts

```ts
import { sseServer } from '@mp281x/realtime'

export const GET = sseServer(async function* () {
	for (let i = 0; true; i += 1) {
		yield { value: i }
		await new Promise(r => void setTimeout(r, 100))
	}
})

// pub/sub
import { sseServer, pubSub } from '@mp281x/realtime'

import { createClient } from 'redis'
export const redis = await createClient().connect()

const { iterator } = await pubSub<{ value: number }>(redis, 'test-channel')
export const GET = sseServer(async function* () {
	yield* iterator('*')
})
```

### Client

```ts
import { sseClient } from '@mp281x/realtime'

// Replace '/...' with your endpoint (the endpoints are typed)
sseClient('/...', x => console.log(x))
```
