declare global {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	export interface Endpoints {}
}

export const sseHandler = <TEndpoints extends Endpoints, Url extends keyof TEndpoints, Data extends TEndpoints[Url]>(
	url: Url,
	handler: (data: Data) => void | Promise<void>
) => {
	const eventSource = new EventSource(url as string)

	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	eventSource.addEventListener('message', async event => {
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const data = JSON.parse(event.data)
			await handler(data)
		} catch {}
	})
}
