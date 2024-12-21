<?xml version="1.0" encoding="utf-8"?>

<xsl:stylesheet version="3.0" 
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:atom="http://www.w3.org/2005/Atom"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">

  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
	<xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title><xsl:value-of select="/rss/channel/title"/>Feed</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
				<link rel="stylesheet" href="/css/reset.css" />
				<link rel="stylesheet" href="/css/theme.css" />
				<style type="text/css">
					p.callout {
						background: var(--colors-surface-container-low);
						color: var(--colors-on-surface);
						padding: 20px;
					}

					header {
						padding: 20px;
					}

					main {
						padding: 20px;
					}

					.item {
						padding: 20px;
						border-bottom: 1px solid var(--colors-surface-container-low);
					}
				</style>
				<script>
					const localTheme = window.localStorage.getItem('theme')
					const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
					const theme = localTheme ?? (prefersDark ? 'dark' : 'light')
			
					document.documentElement.setAttribute('data-theme', theme)
				</script>
      </head>
      <body>
        <nav>
          <p class="callout">
						This is an <a href="https://ncase.me/rss/">RSS feed</a>.
						<br />
						<br />
						Subscribe by copying the <a href="">URL</a> of this page into your newsreader.
          </p>
        </nav>
        <div>
          <header>
            <h1><xsl:value-of select="/rss/channel/title"/></h1>
            <p><xsl:value-of select="/rss/channel/description"/></p>
						<!--
            <a target="_blank">
              <xsl:attribute name="href">
                <xsl:value-of select="/rss/channel/link"/>
              </xsl:attribute>
              Visit Website &#x2192;
            </a>
						-->
          </header>
					<main>
						<h2>latest</h2>
						<xsl:for-each select="/rss/channel/item">
          	  <div class="item">
          	    <h3>
          	      <a target="_blank">
          	        <xsl:attribute name="href">
          	          <xsl:value-of select="link"/>
          	        </xsl:attribute>
          	        <xsl:value-of select="title"/>
          	      </a>
          	    </h3>
          	    <small>
          	      Published: <xsl:value-of select="pubDate" />
          	    </small>
          	  </div>
          	</xsl:for-each>
					</main>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
