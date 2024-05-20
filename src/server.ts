const isBuildTime = () => {
	if (process.env['NEXT_PHASE'] === 'phase-production-build') return true
	if (process.env['NODE_ENV'] === 'production') return true

	return false
}

const iteratorToReadableStream = (iterator: DeepReadonly<Generator | AsyncGenerator>) => {
	const stream = new ReadableStream({
		cancel: async () => {
			try {
				await iterator.return({})
			} catch {}
		},
		pull: async controller => {
			if (isBuildTime()) return controller.close()

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

// eslint-disable-next-line arrow-body-style, @typescript-eslint/prefer-readonly-parameter-types
export const generatorToReadableStream = <T extends Record<string, unknown>>(generator: (request: Request) => Generator<T> | AsyncGenerator<T>) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/require-await, @typescript-eslint/prefer-readonly-parameter-types
	return async (request: Request) => iteratorToReadableStream(generator(request)) as any as T
}
