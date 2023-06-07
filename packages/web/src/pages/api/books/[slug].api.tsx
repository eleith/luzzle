import { readFileSync } from 'fs'
import { NextApiRequest, NextApiResponse } from 'next'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import staticClient from '@app/common/graphql/staticClient'
import gql from '@app/lib/graphql/tag'
import { GetBookOpenGraphImageBySlugDocument } from './_gql_/[slug].api'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import { ResultSuccessOf } from '@app/@types/utilities'
import { getColor, getCoverUrl, getSize } from '@app/common/components/books/BookCoverFor'
import ReactDomServer from 'react-dom/server'
import { themeLight } from '@app/common/components/layout/Page.css'

const fontNotoSans = readFileSync('./public/fonts/NotoSans-Regular.ttf')
const OpenGraphImageWidth = 1200
const OpenGraphImageHeight = 600

const bookQuery = gql<typeof GetBookOpenGraphImageBySlugDocument>(
  `query GetBookOpenGraphImageBySlug($slug: String!) {
  book(slug: $slug) {
    __typename
    ... on Error {
      message
    }
    ... on QueryBookSuccess {
      data {
        ...BookFullDetails
      }
    }
  }
}`,
  bookFragment
)

type Book = ResultSuccessOf<typeof bookQuery, 'book'>

async function getBook(slug: string) {
  const graphQlresponse = await staticClient.query({
    query: bookQuery,
    variables: { slug },
  })

  const response = graphQlresponse.data.book

  if (response?.__typename === 'QueryBookSuccess') {
    return response.data
  }

  return null
}

/* eslint-disable @next/next/no-img-element */
function openGraphImageHtml(book: Book) {
  const color = getColor(book.slug)
  const size = getSize(book.pages, 1.5)
  const url = getCoverUrl(book.slug)

  const cover = url ? (
    <img
      alt={''}
      src={url}
      style={{
        width: size.width,
        height: size.height,
        objectFit: 'cover',
        boxShadow: '-11px 11px 15px #000',
        alignSelf: 'center',
      }}
    />
  ) : (
    <div
      style={{
        backgroundColor: color,
        width: size.width,
        height: size.height,
        objectFit: 'cover',
        boxShadow: '-11px 11px 15px #000',
        alignSelf: 'center',
      }}
    />
  )

  return (
    <div
      style={{
        display: 'flex',
        background: themeLight.colors?.background,
        color: themeLight.colors?.surface,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: `${OpenGraphImageWidth * 0.35}px`,
          justifyContent: 'center',
        }}
      >
        {cover}
      </div>
      <div
        style={{
          display: 'flex',
          padding: '20px',
          flexDirection: 'column',
          justifyContent: 'center',
          height: OpenGraphImageHeight,
          width: `${OpenGraphImageWidth * 0.65}px`,
        }}
      >
        <span style={{ fontSize: '64px' }}>{book.title}</span>
        <span style={{ fontSize: '32px' }}>{book.subtitle}</span>
      </div>
    </div>
  )
}

async function image(html: JSX.Element) {
  return satori(html, {
    width: OpenGraphImageWidth,
    height: OpenGraphImageHeight,
    fonts: [
      {
        name: 'Noto Sans',
        weight: 400,
        style: 'normal',
        data: fontNotoSans,
      },
    ],
  })
}

function ouputSvg(res: NextApiResponse, svg: string) {
  res.writeHead(200, {
    'Content-Type': 'image/svg+xml',
    // 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
  })
  res.write(svg)
  res.end()
}

function ouputPng(res: NextApiResponse, png: Buffer) {
  res.writeHead(200, {
    'Content-Type': 'image/png',
    // 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
  })
  res.write(png)
  res.end()
}

function ouputHtml(res: NextApiResponse, html: JSX.Element) {
  res.writeHead(200, {
    'Content-Type': 'text/html',
    // 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
  })
  res.write(ReactDomServer.renderToStaticMarkup(html))
  res.end()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug, output } = req.query

  if (slug && typeof slug === 'string') {
    const book = await getBook(slug)
    if (book) {
      const html = openGraphImageHtml(book)

      switch (output) {
        case 'svg':
          return ouputSvg(res, await image(html))
        case 'html':
          return ouputHtml(res, html)
        default:
        case 'png':
          return ouputPng(res, await image(html).then((svg) => new Resvg(svg).render().asPng()))
      }
    }
  }

  res.writeHead(404)
  res.end()
}
