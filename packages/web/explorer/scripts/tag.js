const pkgVersion = process.env.npm_package_version
const gitCommitTag = process.env.CI_COMMIT_TAG
const gitBranch = process.env.CI_COMMIT_BRANCH
const gitMainBranch = process.env.CI_REPO_DEFAULT_BRANCH

const packageName = 'web'

function generateTags(version) {
	const parts = version.split('.').map((part) => part.split('-')[0])

	if (parts.length === 0) {
		return []
	}

	const tags = [version]
	if (parts.length >= 3) {
		tags.push(`${parts[0]}.${parts[1]}`)
	}
	if (parts.length >= 2) {
		tags.push(parts[0])
	}
	return tags
}

if (gitCommitTag) {
	const tagPrefix = `${packageName}/v`

	if (gitCommitTag.startsWith(tagPrefix)) {
		const versionFromTag = gitCommitTag.substring(tagPrefix.length)

		if (versionFromTag !== pkgVersion) {
			throw new Error(
				`Version mismatch: Git tag version (${versionFromTag}) does not match package.json version (${pkgVersion}).`
			)
		}

		const tags = generateTags(pkgVersion)
		if (tags.length > 0) {
			console.log(tags.join(','))
		}
	}
	// Silently exit if the tag does not match the prefix for this package.
} else if (gitBranch === gitMainBranch) {
	console.log('latest')
} else {
	const branchName = gitBranch.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
	console.log(branchName)
}
