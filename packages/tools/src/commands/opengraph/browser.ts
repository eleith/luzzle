import puppeteer, { Browser } from 'puppeteer'

let browserSingleton: Browser | null

async function initializeBrowser(): Promise<Browser> {
	const launchArgs = [
		'--no-sandbox',
		'--disable-setuid-sandbox',
		'--disable-dev-shm-usage',
		'--disable-accelerated-2d-canvas',
		'--disable-gpu',
	]

	return await puppeteer.launch({
		headless: true,
		args: launchArgs,
	})
}

async function getBrowser(): Promise<Browser> {
	if (!browserSingleton || !browserSingleton.connected) {
		browserSingleton = await initializeBrowser()
	}
	return browserSingleton
}

export { getBrowser }
