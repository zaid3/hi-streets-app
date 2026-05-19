import './globals.css'

export const metadata = {
  title: 'Hi-Streets',
  description: 'Live Offers & Free Parking Nearby',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Hi-Streets',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#ff681f',
    'msapplication-tap-highlight': 'no',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ff681f',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body style={{ margin: 0, padding: 0, height: '100dvh', overflow: 'hidden', background: '#0a0a0a' }}>
        {children}
      </body>
    </html>
  )
}
