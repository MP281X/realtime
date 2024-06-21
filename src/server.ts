const iteratorToReadableStream = (iterator: Generator | AsyncGenerator) => {
	const stream = new ReadableStream({
		cancel: async () => {
			try {
				await iterator.return({})
			} catch {}
		},
		pull: async controller => {
			const encoder = new TextEncoder()

			const { done, value } = await iterator.next()
			if (done) return controller.close()

			controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`))
		}
	})

	const headers = {
		'Cache-Control': 'no-cache',
		// biome-ignore lint/style/useNamingConvention:
		Connection: 'keep-alive',
		'Content-Type': 'text/event-stream'
	}

	return new Response(stream, { headers })
}

export const generatorToReadableStream = <T extends Record<string, unknown>>(
	generator: (request: Request) => Generator<T> | AsyncGenerator<T>
) => {
	return async (request: Request) => iteratorToReadableStream(generator(request)) as any as T
}
