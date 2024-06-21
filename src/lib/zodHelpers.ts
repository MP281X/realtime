import type { z } from 'zod'

export const formatZodError = (errors: z.ZodIssue[]) => {
	const errorObj: Record<string, string> = {}

	for (const { message, path } of errors) errorObj[path.join('.')] = message

	return errorObj
}

type ZodTypes = {
	zodString: z.ZodString
	zodNumber: z.ZodNumber
	zodEnum: z.ZodEnum<any>
	zodBoolean: z.ZodBoolean
	zodArray: z.ZodArray<any>
	zodObject: z.ZodObject<any>
	zodDefault: z.ZodDefault<any>
}
const zodTypeGuard = <T extends keyof ZodTypes>(typeGuard: T, schema: z.ZodTypeAny): schema is ZodTypes[T] => {
	if (schema._def?.typeName === typeGuard) return true
	if (schema._def === undefined && typeGuard === 'zodObject') return true
	return false
}

export const zodInputShape = <T extends z.ZodTypeAny>(schema: T, key = ''): Record<string, keyof ZodTypes> => {
	if (zodTypeGuard('zodObject', schema)) {
		return Object.entries(schema.shape).reduce<Record<string, keyof ZodTypes>>((prev, [_key, value]) => {
			const nestedKey = key === '' ? _key : `${key}.${_key}`
			return { ...prev, ...zodInputShape(value as any, nestedKey) }
		}, {})
	}

	// biome-ignore format:
	switch (true) {
		case zodTypeGuard('zodArray',   schema): return zodInputShape(schema._def.type, `${key}.{index}`)
		case zodTypeGuard('zodDefault', schema): return zodInputShape(schema._def.innerType, key)
		case zodTypeGuard('zodString',  schema): return { [key]: 'zodString'  }
		case zodTypeGuard('zodNumber',  schema): return { [key]: 'zodNumber'  }
		case zodTypeGuard('zodBoolean', schema): return { [key]: 'zodBoolean' }
		case zodTypeGuard('zodEnum',    schema): return { [key]: 'zodEnum'    }
		default:                                            return {                     }
	}
}

export type FlatObjKeys<Schema, ArrayIndex extends boolean = false, Path extends string = ''> = Schema extends
	| string
	| number
	| boolean
	? Path
	: Path extends `${string}.${string}.${string}.${string}`
		? Path
		: Schema extends (infer ArrEl)[]
			? ArrayIndex extends true
				? FlatObjKeys<ArrEl, ArrayIndex, `${Path}.${number}`>
				: FlatObjKeys<ArrEl, ArrayIndex, Path>
			: Schema extends Record<infer ObjKeys, unknown>
				? Path extends ''
					? // @ts-expect-error: the type of the keys is always string
						{ [K in ObjKeys]: FlatObjKeys<Schema[K], ArrayIndex, K> }[ObjKeys]
					: // @ts-expect-error: the type of the keys is always string
						{ [K in ObjKeys]: FlatObjKeys<Schema[K], ArrayIndex, `${Path}.${K}`> }[ObjKeys]
				: never

type HtmlInputFields = { name: string; type: 'text' | 'number' | 'checkbox' }
export const zodFormSchema = <InputSchema>(zodShape: Record<string, keyof ZodTypes>) => {
	const schema: Record<string, HtmlInputFields> = {}

	for (const [rawPath, type] of Object.entries(zodShape)) {
		const path = rawPath.replaceAll('.{index}', '')

		if (type === 'zodString') schema[path] = { name: path, type: 'text' }
		if (type === 'zodNumber') schema[path] = { name: path, type: 'number' }
		if (type === 'zodBoolean') schema[path] = { name: path, type: 'checkbox' }
		if (type === 'zodEnum') schema[path] = { name: path, type: 'text' }
	}

	return schema as Record<FlatObjKeys<InputSchema>, HtmlInputFields>
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
				// biome-ignore format:
				switch (type) {
					case 'zodString':  return value
					case 'zodNumber':  return Number(value) || undefined
					case 'zodEnum':    return value
					case 'zodBoolean': return value === 'on'
					default:           return undefined
				}
			})

			tmp[key] = isArray ? rawValues : rawValues[0]
		}
	}

	return data
}
