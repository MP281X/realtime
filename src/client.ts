export const sseHandler = function <Endpoints extends Record<string, Record<string, unknown>>>() {
	return <Url extends keyof Endpoints, Data extends Endpoints[Url]>(url: Url, handler: (data: Data) => void | Promise<void>) => {
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
}
