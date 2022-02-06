declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GOOGLE_BOOKS_API_KEY: string
      NEXT_PUBLIC_GRAPHQL_ENDPOINT: string
      HOST: string
      HOST_PUBLIC: string
    }
  }
}

export {}
