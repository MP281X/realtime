function iteratorToReadableStream(iterator: AsyncGenerator) {
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

export function sseServer<T extends AsyncGenerator>(generator: (request: Request) => T) {
	return (request: Request) => iteratorToReadableStream(generator(request)) as any as T
}
