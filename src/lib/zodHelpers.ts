/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
	ZodArray: z.ZodArray<any>
	ZodObject: z.ZodObject<any>
}
const zodTypeGuard = <T extends keyof ZodTypes>(typeGuard: T, schema: z.ZodTypeAny): schema is ZodTypes[T] => {
	if (schema._def?.typeName === typeGuard) return true
	if (schema._def === undefined && typeGuard === 'ZodObject') return true
	return false
}

const zodInputShape = <T extends z.ZodTypeAny>(schema: T, key = '') => {
	let shape: Record<string, keyof ZodTypes> = {}

	if (zodTypeGuard('ZodObject', schema)) {
		for (const [_key, value] of Object.entries(schema.shape)) {
			const nestedKey = key === '' ? _key : `${key}.${_key}`

			const nestedShape = zodInputShape(value as any, nestedKey)
			shape = { ...shape, ...nestedShape }
		}
	}

	if (zodTypeGuard('ZodArray', schema)) {
		const nestedShape = schema._def.type._cached
		shape = { ...shape, ...zodInputShape(nestedShape, `${key}.{index}`) }
	}

	if (zodTypeGuard('ZodString', schema)) shape[key] = 'ZodString'

	if (zodTypeGuard('ZodNumber', schema)) shape[key] = 'ZodNumber'

	if (zodTypeGuard('ZodBoolean', schema)) shape[key] = 'ZodBoolean'

	if (zodTypeGuard('ZodEnum', schema)) shape[key] = 'ZodEnum'

	return shape
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
export const zodFormSchema = <T extends z.ZodObject<z.ZodRawShape>>(rawSchema: T) => {
	const input = zodInputShape(rawSchema)

	// Record<FlatObjKeys<z.input<T>>, HTMLInputFields>
	const schema: Record<string, HTMLInputFields> = {}

	for (const [rawPath, type] of Object.entries(input)) {
		const path = rawPath.replaceAll('.{index}', '')

		if (type === 'ZodString') schema[path] = { name: path, type: 'text' }
		if (type === 'ZodNumber') schema[path] = { name: path, type: 'number' }
		if (type === 'ZodBoolean') schema[path] = { name: path, type: 'checkbox' }
		if (type === 'ZodEnum') schema[path] = { name: path, type: 'text' }
	}

	return schema
}

export const parseFormData = (formData: FormData, schema: z.ZodObject<z.ZodRawShape>) => {
	const input = zodInputShape(schema)
	const data: Record<string, unknown> = {}

	for (const [path, type] of Object.entries(input)) {
		const splittedPath = path.split('.')

		let tmp: any = data
		for (const [index, key] of splittedPath.entries()) {
			if (tmp[key] === undefined && index !== splittedPath.length - 1) {
				tmp[key] = {}
				tmp = tmp[key]
				continue
			}

			const rawValues = formData.getAll(path).map(value => {
				// prettier-ignore
				switch(type) {
						case "ZodString": return value
						case "ZodNumber": return Number(value)||undefined
						case "ZodEnum": return value
						case "ZodBoolean": return value==="on"?true:false
						default: return undefined
					}
			})

			tmp[key] = path.includes('{index}') ? rawValues : rawValues[0]
		}
	}

	return data
}
