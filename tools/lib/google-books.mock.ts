// import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended'
import { books_v1, google, GoogleApis } from 'googleapis'
import { GaxiosPromise } from 'googleapis/build/src/apis/abusiveexperiencereport'
import { Readable } from 'stream'
import { vi } from 'vitest'

// jest.mock('googleapis', () => {
//   return mockDeep<GoogleApis>()
// })
//
// const googleMock = google as unknown as DeepMockProxy<GoogleApis>
// const googleBooksMock = mockDeep<books_v1.Books>()
//
// function setup(): DeepMockProxy<books_v1.Books> {
//   googleMock.books.mockImplementation(() => {
//     return googleBooksMock
//   })
//   return googleBooksMock
// }
//
// export const googleBooksMockReset = (): void => {
//   mockReset(google)
//   setup()
// }
//
// export default setup()

vi.mock('googleapis', async () => {
  const googleApis: GoogleApis = await vi.importActual('googleapis')

  googleApis.books = vi.fn().mockImplementation(() => {
    return (): books_v1.Books => {
      return {
        volumes: {
          list: vi.fn()
        },
      } as unknown as books_v1.Books
    }
  })

  return googleApis
})

function setup(): void {
  // empty
}

export const googleBooksMockReset = (): void => {
  // empty
}

export default setup()
