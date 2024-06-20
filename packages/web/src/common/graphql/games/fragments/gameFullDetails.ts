import gql from 'graphql-tag'

const tag = gql(`fragment GameFullDetails on Game {
    id
    slug
		representativeImage
    title
		datePublished
		publisher
		developer
		playedOn
		datePlayed
		numberOfPlayers
		description
    note
}`)

export default tag
