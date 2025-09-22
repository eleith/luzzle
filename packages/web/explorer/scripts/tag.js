const pkgVersion = process.env.npm_package_version
const CI_COMMIT_TAG = process.env.CI_COMMIT_TAG
const CI_COMMIT_BRANCH = process.env.CI_COMMIT_BRANCH
const CI_REPO_DEFAULT_BRANCH = process.env.CI_REPO_DEFAULT_BRANCH

if (CI_COMMIT_TAG) {
	console.log(pkgVersion)
} else if (CI_COMMIT_BRANCH === CI_REPO_DEFAULT_BRANCH) {
	console.log('latest')
} else {
	const branchName = CI_COMMIT_BRANCH.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
	console.log(branchName)
}
