import gql from 'graphql-tag'

const tag = gql(`fragment LinkFullDetails on Link {
    id
    slug
    representativeImage
    title
    coauthors
		summary
    author
    subtitle
		isPaywall
		isActive
		archiveUrl
		url
		type
		dateAccessed
    note
}`)

export default tag
