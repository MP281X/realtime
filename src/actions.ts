import type { z } from 'zod'
import type { Actions } from '@sveltejs/kit'

import { zodFormSchema, formatZodError } from './lib/zodHelpers'

type MaybePromise<T> = T | Promise<T>
type ActionsEvent = Parameters<Actions[string]>[number]
type MaybeError<Data, Error> =
	| {
			error: undefined
			data: Awaited<Data>
	  }
	| {
			data: undefined
			error: Awaited<Error>
	  }

export const defineSvelteAction = <
	Input extends z.ZodObject<z.ZodRawShape>,
	Data extends z.infer<Input>,
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
		formSchema: zodFormSchema<Input>(action.input['shape'] as any),
		handler: async (event: ActionsEvent): Promise<MaybeError<Res, { [K in keyof Res]?: string }>> => {
			const schema = action.input
			const result = schema.safeParse(await parseBody(event.request))

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			if (result.success === false) return { data: undefined, error: formatZodError(result.error.errors) as any }

			return { data: await action.handler(result.data as any, event), error: undefined }
		}
	}
}

export const svelteActions = <T extends Record<string, ReturnType<typeof defineSvelteAction>>>(actions: T) => {
	const inputs: Record<string, unknown> = {}
	const handlers: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(actions)) {
		inputs[key] = value.formSchema
		handlers[key] = value.handler
	}

	return {
		formsSchema: inputs as { [K in keyof T]: T[K]['formSchema'] },
		handlers: handlers as { [K in keyof T]: T[K]['handler'] }
	}
}
