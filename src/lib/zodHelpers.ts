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
	ZodDefault: z.ZodDefault<any>
}
const zodTypeGuard = <T extends keyof ZodTypes>(typeGuard: T, schema: z.ZodTypeAny): schema is ZodTypes[T] => {
	if (schema._def?.typeName === typeGuard) return true
	if (schema._def === undefined && typeGuard === 'ZodObject') return true
	return false
}

export const zodInputShape = <T extends z.ZodTypeAny>(schema: T, key = ''): Record<string, keyof ZodTypes> => {
	if (zodTypeGuard('ZodObject', schema)) {
		return Object.entries(schema.shape).reduce<Record<string, keyof ZodTypes>>((prev, [_key, value]) => {
			const nestedKey = key === '' ? _key : `${key}.${_key}`
			return { ...prev, ...zodInputShape(value as any, nestedKey) }
		}, {})
	}

	// prettier-ignore
	switch (true) {
		case zodTypeGuard('ZodArray',   schema): return zodInputShape(schema._def.type, `${key}.{index}`)
		case zodTypeGuard('ZodDefault', schema): return zodInputShape(schema._def.innerType, key)
		case zodTypeGuard('ZodString',  schema): return { [key]: 'ZodString'  }
		case zodTypeGuard('ZodNumber',  schema): return { [key]: 'ZodNumber'  }
		case zodTypeGuard('ZodBoolean', schema): return { [key]: 'ZodBoolean' }
		case zodTypeGuard('ZodEnum',    schema): return { [key]: 'ZodEnum'    }
		default:                                            return {                     }
	}
}

export type FlatObjKeys<Schema, Path extends string = ''> =
	Schema extends string | number | boolean ? Path
	: Path extends `${string}.${string}.${string}` ? `${Path}.${string}`
	: Schema extends (infer ArrEl)[] ? FlatObjKeys<ArrEl, Path>
	: Schema extends Record<infer ObjKeys, unknown> ?
		Path extends '' ?
			// @ts-expect-error: the type of the keys is always string
			{ [K in ObjKeys]: FlatObjKeys<Schema[K], K> }[ObjKeys]
		:	// @ts-expect-error: the type of the keys is always string
			{ [K in ObjKeys]: FlatObjKeys<Schema[K], `${Path}.${K}`> }[ObjKeys]
	:	never

type HTMLInputFields = { name: string; type: 'text' | 'number' | 'checkbox' }
export const zodFormSchema = <InputSchema>(zodShape: Record<string, keyof ZodTypes>) => {
	const schema: Record<string, HTMLInputFields> = {}

	for (const [rawPath, type] of Object.entries(zodShape)) {
		const path = rawPath.replaceAll('.{index}', '')

		if (type === 'ZodString') schema[path] = { name: path, type: 'text' }
		if (type === 'ZodNumber') schema[path] = { name: path, type: 'number' }
		if (type === 'ZodBoolean') schema[path] = { name: path, type: 'checkbox' }
		if (type === 'ZodEnum') schema[path] = { name: path, type: 'text' }
	}

	return schema as Record<FlatObjKeys<InputSchema>, HTMLInputFields>
}

export const parseFormData = (formData: FormData, zodShape: Record<string, keyof ZodTypes>) => {
	const data: Record<string, unknown> = {}

	for (const [rawPath, type] of Object.entries(zodShape)) {
		const path = rawPath.replaceAll('.{index}', '')
		const isArray = rawPath.includes('{index}')

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
				switch (type) {
					case "ZodString":  return value
					case "ZodNumber":  return Number(value) || undefined
					case "ZodEnum":    return value
					case "ZodBoolean": return value === "on" ? true : false
					default:           return undefined
				}
			})

			tmp[key] = isArray ? rawValues : rawValues[0]
		}
	}

	return data
}
