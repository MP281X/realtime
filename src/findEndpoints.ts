import fastGlob from 'fast-glob'

export const getEndpoints = async () => {
	const rawEndpoints = await fastGlob.glob(['app/**/route.ts', 'src/routes/**/+server.ts', 'src/pages/**/*.ts'])

	const endpoints: { key: string; path: string; importName: string }[] = []

	for (const path of rawEndpoints) {
		let key = path
		// remove nextjs path and file name
		key = key.replace('app', '')
		key = key.replace('route.ts', '')

		// remove sveltekit path and file name
		key = key.replace('src/routes', '')
		key = key.replace('+server.ts', '')

		// remove astro path and file name
		key = key.replace('src/pages', '')
		key = key.replace('.ts', '')

		// remove unnecessary /
		key = key.replace(/\/+/g, '/')
		if (key.length > 1 && key.endsWith('/')) key = key.slice(0, -1)
		if (key.length > 1 && key.startsWith('/')) key = key.slice(1)

		let importName = key.replaceAll('/', '_')
		if (importName === '_') importName = 'index'

		endpoints.push({ importName, key: `/${key.replace(/\/+/g, '/')}`, path: './' + path })
	}

	return endpoints
}
