#! /usr/bin/env node

import { mkdirSync } from 'fs'
import sharp from 'sharp'
import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { getItems, getLastRun, storeLastRun } from './utils.js'
import { getDatabaseClient, Pieces, PieceSelectable } from '@luzzle/core'
import { dirname } from 'path'

type ImageVariants = {
	sizes: Array<100 | 125 | 200 | 250 | 500 | 1000>
	dimensions: Array<{ width: number; height: number; label: string }>
}

async function makeVariants(
	slug: string,
	folder: string,
	luzzleFolder: string,
	path: string,
	variants: ImageVariants
): Promise<void> {
	try {
		const coverSharp = sharp(`${luzzleFolder}/${path}`)
		const types = ['jpg', 'avif'] as Array<'jpg' | 'avif'>
		const { sizes, dimensions } = variants
		const outputFolder = `${folder}/${path}`

		mkdirSync(dirname(outputFolder), { recursive: true })

		for (const size of sizes) {
			for (const type of types) {
				for (const { width, height, label } of dimensions) {
					const variantPath = `${outputFolder}.${label}${size}.${type}`

					await coverSharp
						.resize({ width: Math.round(size * width), height: Math.round(size * height) })
						.toFile(variantPath)
				}
			}
		}

		console.log(`generated variants for: ${slug}`)
	} catch (e) {
		console.log(e)
		console.error(`error generating variants for: ${slug}`)
	}
}

async function makeManyVariants(
	outputFolder: string,
	luzzleFolder: string,
	items: Array<{ slug: string; image: string }>,
	variants: ImageVariants
) {
	mkdirSync(outputFolder, { recursive: true })

	for (const item of items) {
		await makeVariants(item.slug, outputFolder, luzzleFolder, item.image, variants)
	}
}

async function getItemsWithImages<T extends Pieces>(
	db: ReturnType<typeof getDatabaseClient>,
	lastRun: number,
	table: T
) {
	const items = await getItems(db, lastRun, table)

	switch (table) {
		case 'books':
			return (items as PieceSelectable<'books'>[])
				.filter((item) => item.cover)
				.map((item) => ({
					slug: item.slug,
					image: item.cover as string,
				}))
		case 'links':
			return (items as PieceSelectable<'links'>[])
				.filter((item) => item.representative_image)
				.map((item) => ({
					slug: item.slug,
					image: item.representative_image as string,
				}))
		case 'texts':
			return (items as PieceSelectable<'texts'>[])
				.filter((item) => item.representative_image)
				.map((item) => ({
					slug: item.slug,
					image: item.representative_image as string,
				}))
	}

	return []
}

async function run() {
	try {
		const command = await parseArgs(hideBin(process.argv))
		const outputFolder = command.output
		const lastRun = await getLastRun(outputFolder)
		const db = getDatabaseClient(command.database)
		const type = command.type as Pieces
		const itemsWithImages = await getItemsWithImages(db, lastRun, type)

		await makeManyVariants(outputFolder, command.input, itemsWithImages, {
			sizes: [125, 250, 500, 1000],
			dimensions:
				command.variant === 'width'
					? [{ width: 1, height: 3 / 2, label: 'w' }]
					: [{ width: 3 / 2, height: 1, label: 'h' }],
		})

		await storeLastRun(outputFolder, new Date())
	} catch (err) {
		console.error(err)
	}
}

run()
