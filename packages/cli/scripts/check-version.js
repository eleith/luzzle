const pkgVersion = process.env.npm_package_version
const gitCommitTag = process.env.CI_COMMIT_TAG
const packageName = 'cli'

if (gitCommitTag) {
	const tagPrefix = `${packageName}/v`

	if (gitCommitTag.startsWith(tagPrefix)) {
		const versionFromTag = gitCommitTag.substring(tagPrefix.length)

		if (versionFromTag !== pkgVersion) {
			throw new Error(
				`Version mismatch: Git tag version (${versionFromTag}) does not match package.json version (${pkgVersion}).`
			)
		}

		console.log(pkgVersion)
	} else {
		throw new Error(
			`Invalid git tag format: Expected prefix "${tagPrefix}".`
		)
	}
} else {
	throw new Error('No git tag found.')
}
