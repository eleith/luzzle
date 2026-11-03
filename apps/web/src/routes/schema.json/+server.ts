import editorSchema from '@luzzle/web.templates/config.schema.json' with { type: 'json' }

export function GET() {
	return Response.json(editorSchema, {
		headers: {
			'Content-Type': 'application/schema+json; charset=utf-8',
			'Cache-Control': 'public, max-age=0, must-revalidate'
		}
	})
}
