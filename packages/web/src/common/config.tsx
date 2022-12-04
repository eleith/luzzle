const config = {
  public: {
    GRAPHQL_ENDPOINT: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
    HOST: process.env.NEXT_PUBLIC_HOST,
    HOST_STATIC: process.env.NEXT_PUBLIC_HOST_STATIC,
  },
  private: {
    SITE_TITLE: process.env.TITLE,
    SITE_DESCRIPTION: process.env.DESCRIPTION,
    EMAILJS_USER: process.env.EMAILJS_USER,
    EMAILJS_HOST: process.env.EMAILJS_HOST,
    EMAILJS_PORT: process.env.EMAILJS_PORT,
    EMAILJS_PASSWORD: process.env.EMAILJS_PASSWORD,
    DATABASE_URL: process.env.DATABASE_URL,
  },
  isDevelopment: process.env.NODE_ENV === 'development',
}

export default config
