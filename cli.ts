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

const routeObjType = objectTypeFactory('RawEndpoints', Object.fromEntries(routeObj))

const endpointsType = `
type EndpointType = (request: Request) => Promise<Record<string, unknown>>
type EndpointReturnType<Endpoint> = Endpoint extends { GET: (request: Request) => infer ReturnType } ? Awaited<ReturnType> : never

export type TEndpoints = {
	[K in keyof RawEndpoints as RawEndpoints[K] extends { GET: EndpointType } ? K : never]: EndpointReturnType<RawEndpoints[K]>
}

declare global {
	interface Endpoints extends TEndpoints {}
}
`

writeNodesToFile('./sse.g.ts', [...typeImports, routeObjType, endpointsType])
