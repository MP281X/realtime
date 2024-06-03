const iteratorToReadableStream = (iterator: Generator | AsyncGenerator) => {
	const stream = new ReadableStream({
		cancel: async () => {
			try {
				await iterator.return({})
			} catch {}
		},
		pull: async controller => {
			const encoder = new TextEncoder()

			// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unsafe-assignment
			const { done, value } = await iterator.next()
			if (done) return controller.close()

			controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`))
		}
	})

	const headers = {
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive', // eslint-disable-line @typescript-eslint/naming-convention
		'Content-Type': 'text/event-stream'
	}

	return new Response(stream, { headers })
}

// eslint-disable-next-line arrow-body-style
export const generatorToReadableStream = <T extends Record<string, unknown>>(generator: (request: Request) => Generator<T> | AsyncGenerator<T>) => {
	// eslint-disable-next-line @typescript-eslint/require-await
	return async (request: Request) => iteratorToReadableStream(generator(request)) as any as T
}
