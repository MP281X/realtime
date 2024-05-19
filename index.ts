#!/usr/bin/env node

import { getEndpoints } from './src/findEndpoints.ts'
import { importFactory, exportFactory, writeNodesToFile, objectTypeFactory, typeImportFactory, directExportFactory } from './src/tsFactory.ts'

const typeImports = []
const routeObj = new Map<string, string>()
for (const { importName, key, path } of await getEndpoints()) {
	typeImports.push(typeImportFactory(importName, path))
	routeObj.set(key, importName)
}

const routeObjType = objectTypeFactory('RawEndpoints', Object.fromEntries(routeObj))

const endpointsType = `
type EndpointType = (request: Request) => Promise<Record<string, unknown>>
type EndpointReturnType<Endpoint> = Endpoint extends { GET: (request: Request) => infer ReturnType } ? Awaited<ReturnType> : never
type Endpoints = {
	[K in keyof RawEndpoints as RawEndpoints[K] extends { GET: EndpointType } ? K : never]: EndpointReturnType<RawEndpoints[K]>
}
`

const clientImport = importFactory('sseHandler', '@mp281x/realtime')
const clientExport = exportFactory('sseClient', 'sseHandler', 'Endpoints')

const serverExport = directExportFactory('generatorToReadableStream', 'sseServer', '@mp281x/realtime')

writeNodesToFile('./sse.g.ts', [...typeImports, clientImport, routeObjType, endpointsType, clientExport, serverExport])

export { sseHandler } from './src/client.ts'
export { generatorToReadableStream } from './src/server.ts'
