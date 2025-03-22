import path from "path";
import type { RequestHandler } from "./$types";
import { getStorage } from "$lib/storage";
import mime from "mime/lite"
import { Readable } from "stream";

export const GET: RequestHandler = async ({ params }) => {
	const assetPath = path.normalize(params.asset)
	const storage = getStorage()

	try {
		const stream = storage.createReadStream(assetPath)
		const type = path.extname(assetPath).substring(1)
		const responseType = type ? mime.getType(type) : null
		const defaultType = 'application/octet-stream'
		const webStream = Readable.toWeb(stream) as ReadableStream

		return new Response(webStream, {
			headers: {
				'Content-Type': responseType ?? defaultType,
			}
		})
	} catch (error) {
		console.error(error)
		return new Response("asset not found", { status: 404 });
	}
}
