export async function imageToBase64(media: Buffer) {
	const base64 = media.toString('base64')
	return `data:image/jpeg;base64,${base64}`
}
