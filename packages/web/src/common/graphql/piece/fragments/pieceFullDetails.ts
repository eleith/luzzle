import gql from 'graphql-tag'

const tag = gql(`fragment PieceFullDetails on Piece {
    id
    slug
		media
    title
		type
		dateOrder
    note
}`)

export default tag
