#!/usr/bin/env node

import type { Node } from 'typescript'

import { getEndpoints } from './src/findEndpoints.ts'
import { writeNodesToFile, objectTypeFactory, typeImportFactory } from './src/tsFactory.ts'

const typeImports: Node[] = []
const routeObj = new Map<string, string>()
for (const { importName, key, path } of await getEndpoints()) {
	typeImports.push(typeImportFactory(importName, path))
	routeObj.set(key, importName)
}

const routeObjType = objectTypeFactory('FileExports', Object.fromEntries(routeObj))

const endpointsType = `
type EndpointType = (request: Request) => Promise<Record<string, unknown>>
type EndpointReturnType<Endpoint extends EndpointType> = Awaited<ReturnType<Endpoint>>
type TEndpoints = {
	[K in keyof FileExports as FileExports[K] extends { GET: EndpointType } ? K : never]:
		// @ts-ignore-error
		EndpointReturnType<FileExports[K]['GET']>
}

type ActionsType = Record<string, (...args: any) => Promise<unknown>>
type ActionsReturnType<Action extends ActionsType> = {
	[K in keyof Action]: Awaited<ReturnType<Action[K]>>
}
type TActions = {
	[K in keyof FileExports as FileExports[K] extends { actions: ActionsType } ? K : never]:
		// @ts-ignore-error
		ActionsReturnType<FileExports[K]['actions']>
}

declare global {
	interface Endpoints extends TEndpoints {}
	interface Actions extends TActions {}
}
`

writeNodesToFile('./sse.g.ts', [...typeImports, routeObjType, endpointsType])
