import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <meta name="theme-color" content="#0d9488" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
