import { Vibrant } from 'node-vibrant/node'
import { ImageBase, ImageSource } from '@vibrant/image'
import sharp from 'sharp'

class SharpImage extends ImageBase {
	private _image: ImageData = {
		width: 0,
		height: 0,
		data: new Uint8ClampedArray(),
		colorSpace: 'srgb',
	}

	async load(image: ImageSource): Promise<ImageBase> {
		try {
			let buffer: Buffer

			if (typeof image === 'string') {
				if (image.startsWith('http')) {
					const response = await fetch(image)
					buffer = Buffer.from(await response.arrayBuffer())
				} else {
					buffer = Buffer.from(image)
				}
			} else if (image instanceof Buffer) {
				buffer = image
			} else {
				return Promise.reject(
					new Error('Cannot load image from HTMLImageElement in node environment')
				)
			}

			const { data, info } = await sharp(buffer)
				.resize(200, 200, { fit: 'inside', withoutEnlargement: true })
				.ensureAlpha()
				.raw()
				.toBuffer({ resolveWithObject: true })

			this._image = {
				width: info.width,
				height: info.height,
				data: data as unknown as Uint8ClampedArray,
				colorSpace: 'srgb',
			}

			return this
		} catch (error) {
			return Promise.reject(error)
		}
	}
	clear(): void { }
	update(): void { }
	getWidth(): number {
		return this._image.width
	}
	getHeight(): number {
		return this._image.height
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	resize(_: number, __: number, ___: number): void {
		// done in the load step, ignoring any maxDimension or quality options
	}
	getPixelCount(): number {
		const { width, height } = this._image
		return width * height
	}
	getImageData(): ImageData {
		return this._image
	}
	remove(): void { }
}

async function getPalette(image: string | Buffer) {
	const palette = await new Vibrant(image, { ImageClass: SharpImage }).getPalette()

	return {
		background: palette.DarkVibrant?.hex,
		bodyText: palette.DarkVibrant?.bodyTextColor,
		titleText: palette.DarkVibrant?.titleTextColor,
		accent: palette.LightVibrant?.hex,
		muted: palette.Muted?.hex,
	}
}

export { getPalette, SharpImage }
