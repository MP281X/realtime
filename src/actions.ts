import type { Actions } from '@sveltejs/kit'
import type { z } from 'zod'

import { type FlatObjKeys, formatZodError, parseFormData, zodFormSchema, zodInputShape } from './lib/zodHelpers'

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
	InputSchema extends z.ZodObject<z.ZodRawShape>,
	Data extends z.infer<InputSchema>,
	InputType extends z.input<InputSchema>,
	Res extends MaybePromise<void | Record<string, unknown>>
>(action: {
	input: InputSchema
	handler: (data: Data, event: ActionsEvent) => Res
}) => {
	const zodShape = zodInputShape(action.input)

	const parseBody = async (request: Request) => {
		let reqBody: Record<string, unknown> | Record<string, unknown>[] = {}

		const contentType = request.headers.get('content-type')

		if (contentType === 'application/json') reqBody = await request.json()
		if (contentType === 'application/x-www-form-urlencoded') reqBody = parseFormData(await request.formData(), zodShape)

		return reqBody
	}

	return {
		formSchema: zodFormSchema<InputType>(zodShape),
		handler: async (event: ActionsEvent): Promise<MaybeError<Res, Record<FlatObjKeys<InputType, true>, string>>> => {
			const schema = action.input
			const result = schema.safeParse(await parseBody(event.request))

			if (result.success === false)
				return {
					data: undefined,
					error: formatZodError(result.error.errors) as any
				}

			return {
				data: await action.handler(result.data as any, event),
				error: undefined
			}
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
		formSchema: inputs as { [K in keyof T]: T[K]['formSchema'] },
		handlers: handlers as { [K in keyof T]: T[K]['handler'] }
	}
}

export const defineReactAction = <
	InputSchema extends z.ZodObject<z.ZodRawShape>,
	Data extends z.infer<InputSchema>,
	InputType extends z.input<InputSchema>,
	Res extends void | Promise<void>
>(action: {
	input: InputSchema
	handler: (data: MaybeError<Data, Record<FlatObjKeys<InputType, true>, string>>) => Res
}) => {
	const zodShape = zodInputShape(action.input)

	return {
		formSchema: zodFormSchema<InputType>(zodShape),
		handler: (formData: FormData) => {
			const schema = action.input
			const result = schema.safeParse(parseFormData(formData, zodShape))

			if (result.success === false)
				return action.handler({
					data: undefined,
					error: formatZodError(result.error.errors) as any
				})

			return action.handler({ data: result.data as any, error: undefined })
		}
	}
}
