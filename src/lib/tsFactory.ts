import fs from 'node:fs'
import ts from 'typescript'

export const objectTypeFactory = (name: string, obj: Record<string, string>) =>
	ts.factory.createTypeAliasDeclaration(
		undefined,
		ts.factory.createIdentifier(name),
		undefined,
		ts.factory.createTypeLiteralNode(
			Object.entries(obj).map(([key, value]) =>
				ts.factory.createPropertySignature(
					undefined,
					ts.factory.createStringLiteral(key),
					undefined,
					ts.factory.createTypeQueryNode(ts.factory.createIdentifier(value), undefined)
				)
			)
		)
	)

export const typeImportFactory = (name: string, path: string) =>
	ts.factory.createImportDeclaration(
		undefined,
		ts.factory.createImportClause(true, undefined, ts.factory.createNamespaceImport(ts.factory.createIdentifier(name))),
		ts.factory.createStringLiteral(path),
		undefined
	)

const nodeToStr = (node: ts.Node) =>
	ts
		.createPrinter({ newLine: ts.NewLineKind.LineFeed })
		// @ts-expect-error
		.printNode(ts.EmitHint.Unspecified, node, undefined)

export const writeNodesToFile = (fileName: string, nodes: readonly (string | ts.Node)[]) => {
	const fileContent: string[] = []

	for (const node of nodes) fileContent.push(typeof node === 'string' ? node : nodeToStr(node))

	fs.mkdirSync('.codegen/', { recursive: true })
	fs.writeFileSync(fileName, fileContent.join('\n\n'))
}
