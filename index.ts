#!/usr/bin/env node

import { getEndpoints } from './src/findEndpoints.ts'
import { importFactory, exportFactory, writeNodesToFile, objectTypeFactory, typeImportFactory } from './src/tsFactory.ts'

const typeImports = []
const routeObj = new Map<string, string>()
for (const { importName, key, path } of await getEndpoints()) {
	typeImports.push(typeImportFactory(importName, path))
	routeObj.set(key, importName)
}

const routeObjType = objectTypeFactory('RawEndpoints', Object.fromEntries(routeObj))

const endpointsType = `
type EndpointType = (request: Request) => Promise<Record<string, unknown>>
type EndpointReturnType<Endpoint> = Endpoint extends { GET: () => infer ReturnType } ? Awaited<ReturnType> : never
type Endpoints = {
	[K in keyof RawEndpoints as RawEndpoints[K] extends { GET: EndpointType } ? K : never]: EndpointReturnType<RawEndpoints[K]>
}
`

const importServerHandler = importFactory('generatorToReadableStream', '@mp281x/realtime')
const importClientHandler = importFactory('sseHandler', '@mp281x/realtime')

const clientExport = exportFactory('sseClient', 'sseHandler', 'Endpoints')
const serverExport = exportFactory('sseClient', 'sseHandler', 'Endpoints')

writeNodesToFile('./imports.g.ts', [
	...typeImports,
	importServerHandler,
	importClientHandler,
	routeObjType,
	endpointsType,
	clientExport,
	serverExport
])

export { sseHandler } from './src/client.ts'
export { generatorToReadableStream } from './src/server.ts'
