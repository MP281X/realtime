declare global {
	export interface Endpoints {}
}

export function sseClient<TEndpoints extends Endpoints, Url extends keyof TEndpoints, Data extends TEndpoints[Url]>(
	url: Url,
	handler: (data: Data) => void | Promise<void>
) {
	const eventSource = new EventSource(url as string)

	eventSource.addEventListener('message', async event => {
		try {
			const data = JSON.parse(event.data)
			await handler(data)
		} catch {}
	})
}
