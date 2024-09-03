#!/usr/bin/env node

import type { Node } from 'typescript'

import { getEndpoints } from './src/lib/findEndpoints.ts'
import { objectTypeFactory, typeImportFactory, writeNodesToFile } from './src/lib/tsFactory.ts'

const typeImports: Node[] = []
const routeObj = new Map<string, string>()
for (const { importName, key, path } of getEndpoints()) {
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

declare global {
	interface Endpoints extends TEndpoints {}
}
`

writeNodesToFile('.codegen/sse.ts', [...typeImports, routeObjType, endpointsType])
