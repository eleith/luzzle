import { existsSync, readFileSync } from 'fs'
import { dirname } from 'path'
import satori from 'satori'
import { Writable } from 'stream'
import { fileURLToPath } from 'url'

const OpenGraphImageWidth = 1200
const OpenGraphImageHeight = 600
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function imageAsBase64(path: string) {
	if (existsSync(path)) {
		const image = readFileSync(path)
		const base64 = image.toString('base64')
		return `data:image/jpeg;base64,${base64}`
	}
	return null
}

async function image(html: JSX.Element) {
	return satori(html, {
		width: OpenGraphImageWidth,
		height: OpenGraphImageHeight,
		fonts: [
			{
				name: 'Noto Sans',
				weight: 400,
				style: 'normal',
				data: readFileSync(`${__dirname}/NotoSans-Regular.ttf`),
			},
		],
	})
}

function outputSvg(res: Writable, svg: string) {
	res.write(svg)
	res.end()
}

function outputPng(res: Writable, png: Buffer) {
	res.write(png)
	res.end()
}

function html(image: JSX.Element, item: { title: string; subtitle: string }) {
	return (
		<div
			style={{
				display: 'flex',
				background: '#fbf1c7',
				color: '#3c3836',
			}}
		>
			<div
				style={{
					display: 'flex',
					width: `${OpenGraphImageWidth * 0.35}px`,
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				{image}
			</div>
			<div
				style={{
					display: 'flex',
					padding: '20px',
					flexDirection: 'column',
					justifyContent: 'center',
					height: OpenGraphImageHeight,
					width: `${OpenGraphImageWidth * 0.65}px`,
				}}
			>
				<span style={{ fontSize: '64px' }}> {item.title} </span>
				<span style={{ fontSize: '32px' }}> {item.subtitle} </span>
			</div>
		</div>
	)
}

export {
	html,
	imageAsBase64,
	OpenGraphImageWidth,
	OpenGraphImageHeight,
	image,
	outputPng,
	outputSvg,
}
