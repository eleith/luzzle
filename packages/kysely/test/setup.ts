// https://github.com/vitest-dev/vitest/issues/1692

process.on('unhandledRejection', (reason) => {
	console.log('FAILED TO HANDLE PROMISE REJECTION')
	throw reason
})

export default {}
