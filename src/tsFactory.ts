import fs from 'fs'
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

export const importFactory = (name: string, path: string) =>
	ts.factory.createImportDeclaration(
		undefined,
		ts.factory.createImportClause(
			false,
			undefined,
			ts.factory.createNamedImports([ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(name))])
		),
		ts.factory.createStringLiteral(path),
		undefined
	)

export const exportFactory = (exportName: string, fnName: string, typeName: string) =>
	ts.factory.createVariableStatement(
		[ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createVariableDeclarationList(
			[
				ts.factory.createVariableDeclaration(
					ts.factory.createIdentifier(exportName),
					undefined,
					undefined,
					ts.factory.createCallExpression(
						ts.factory.createIdentifier(fnName),
						[ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(typeName), undefined)],
						[]
					)
				)
			],
			ts.NodeFlags.Const
		)
	)

export const directExportFactory = (exportName: string, exportAlias: string, path: string) =>
	ts.factory.createExportDeclaration(
		undefined,
		false,
		ts.factory.createNamedExports([
			ts.factory.createExportSpecifier(false, ts.factory.createIdentifier(exportName), ts.factory.createIdentifier(exportAlias))
		]),
		ts.factory.createStringLiteral(path),
		undefined
	)

const nodeToStr = (node: ts.Node) =>
	// @ts-expect-error
	ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printNode(ts.EmitHint.Unspecified, node, undefined)

export const writeNodesToFile = (fileName: string, nodes: readonly (string | ts.Node)[]) => {
	const fileContent: string[] = []

	for (const node of nodes) fileContent.push(typeof node === 'string' ? node : nodeToStr(node))

	fs.writeFileSync(fileName, fileContent.join('\n\n'))
}
