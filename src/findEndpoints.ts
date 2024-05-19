import fastGlob from 'fast-glob'

export const getEndpoints = async () => {
	const rawEndpoints = await fastGlob.glob(['app/**/route.ts', 'src/routes/**/+server.ts'])

	const endpoints: { key: string; path: string; importName: string }[] = []

	for (const path of rawEndpoints) {
		let key = path
		// remove nextjs path and file name
		key = key.replace('app', '')
		key = key.replace('route.ts', '')

		// remove sveltekit path and file name
		key = key.replace('src/routes', '')
		key = key.replace('+server.ts', '')

		// remove unnecessary /
		if (key.endsWith('/')) key = key.slice(0, -1)

		let importName = key.replaceAll('/', '_')
		if (importName.startsWith('_')) importName = importName.slice(1)
		if (importName === '_' || importName === '') importName = 'index'

		endpoints.push({ importName, key, path: './' + path })
	}

	return endpoints
}
