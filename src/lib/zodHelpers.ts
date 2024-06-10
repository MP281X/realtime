/* eslint-disable @typescript-eslint/naming-convention */

import type { z } from 'zod'

export const formatZodError = (errors: z.ZodIssue[]) => {
	const errorObj: Record<string, any> = {}

	for (const { message, path } of errors) errorObj[path.join('.')] = message

	return errorObj
}

type ZodTypes = {
	ZodString: z.ZodString
	ZodNumber: z.ZodNumber
	ZodEnum: z.ZodEnum<any>
	ZodBoolean: z.ZodBoolean
	ZodObject: z.ZodObject<any>
	// ZodArray: z.ZodArray<any>
}
const zodTypeGuard = <T extends keyof ZodTypes>(typeGuard: T, schema: z.ZodTypeAny): schema is ZodTypes[T] => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	if (schema._def?.typeName === typeGuard) return true
	if (schema._def === undefined && typeGuard === 'ZodObject') return true
	return false
}

// type FlatObjKeys<Schema, Path extends string = ''> =
// 	Schema extends Record<string, unknown> ?
// 		{
// 			[K in keyof Schema]: K extends string ?
// 				Path extends '' ?
// 					FlatObjKeys<Schema[K], K>
// 				:	FlatObjKeys<Schema[K], `${Path}.${K}`>
// 			:	never
// 		}[keyof Schema]
// 	: Schema extends string | number | boolean ? Path
// 	: never

type HTMLInputFields = { name: string; type: 'text' | 'number' | 'checkbox' }
// type ZodFormSchemaReturn<T extends z.ZodObject<z.ZodRawShape>> = Record<FlatObjKeys<z.input<T>>, HTMLInputFields>
export const zodFormSchema = <T extends z.ZodObject<z.ZodRawShape>>(rawSchema: T, key = ''): Record<string, HTMLInputFields> => {
	let shape: Record<string, HTMLInputFields> = {}

	const schema = rawSchema as z.ZodTypeAny

	if (zodTypeGuard('ZodObject', schema)) {
		for (const [_key, value] of Object.entries(schema.shape)) {
			const nestedKey = key === '' ? _key : `${key}.${_key}`

			const nestedShape = zodFormSchema(value as any, nestedKey)
			shape = { ...shape, ...nestedShape }
		}
	}

	// if (zodTypeGuard("ZodArray", schema)) {
	// 	const nestedShape = schema._def.type._cached
	// 	shape = { ...shape, ...zodInputShape(nestedShape, `${key}.{index}`) }
	// }

	if (zodTypeGuard('ZodString', schema)) shape[key] = { name: key, type: 'text' }

	if (zodTypeGuard('ZodNumber', schema)) shape[key] = { name: key, type: 'number' }

	if (zodTypeGuard('ZodBoolean', schema)) shape[key] = { name: key, type: 'checkbox' }

	if (zodTypeGuard('ZodEnum', schema)) shape[key] = { name: key, type: 'text' }

	return shape
}
