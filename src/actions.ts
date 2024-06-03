import type { Actions } from '@sveltejs/kit'

import * as v from 'valibot'

type MaybePromise<T> = T | Promise<T>
type ActionsEvent = Parameters<Actions[string]>[number]

export const defineAction = <
	Input extends v.ObjectSchema<any, any>,
	Data extends v.InferOutput<Input>,
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	Res extends MaybePromise<void | Record<string, unknown>>
>(action: {
	input: Input
	handler: (data: Data, event: ActionsEvent) => Res
}) => {
	const parseBody = async (request: Request) => {
		let reqBody: Record<string, unknown> | Record<string, unknown>[] = {}

		const contentType = request.headers.get('content-type')

		if (contentType === 'application/json') {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			reqBody = await request.json()
		}

		if (contentType === 'application/x-www-form-urlencoded') {
			const formData = await request.formData()
			reqBody = Object.fromEntries(formData.entries())
		}

		return reqBody
	}

	return {
		handler: async (event: ActionsEvent): Promise<Awaited<Res> | { errors: Record<string, unknown> }> => {
			const schema = action.input as v.ObjectSchema<v.ObjectEntries, any>
			const result = v.safeParse(schema, await parseBody(event.request))

			if (result.success === false) return { errors: v.flatten(result.issues).nested ?? {} }

			return await action.handler(result.output as any, event)
		},
		schema: action.input
	}
}

export const actionsRouter = <T extends Record<string, ReturnType<typeof defineAction>>>(actions: T) => {
	const inputs: Record<string, unknown> = {}
	const handlers: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(actions)) {
		inputs[key] = value.schema
		handlers[key] = value.handler
	}

	return {
		handlers: handlers as { [K in keyof T]: T[K]['handler'] },
		schema: inputs as { [K in keyof T]: T[K]['schema'] }
	}
}
