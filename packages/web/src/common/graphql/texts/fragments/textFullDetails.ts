import gql from 'graphql-tag'

const tag = gql(`fragment TextFullDetails on Text {
    id
    slug
		representativeImage
    title
		subtitle
		datePublished
		summary
    note
}`)

export default tag
