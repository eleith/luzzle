import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended'
import { books_v1, google, GoogleApis } from 'googleapis'

jest.mock('googleapis', () => {
  return mockDeep<GoogleApis>()
})

const googleMock = google as unknown as DeepMockProxy<GoogleApis>
const googleBooksMock = mockDeep<books_v1.Books>()

function setup(): DeepMockProxy<books_v1.Books> {
  googleMock.books.mockImplementation(() => {
    return googleBooksMock
  })
  return googleBooksMock
}

export const googleBooksMockReset = (): void => {
  mockReset(google)
  setup()
}

export default setup()
