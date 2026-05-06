import './globals.css'

export const metadata = {
  title: 'Hi-Streets — Live Offers & Free Parking',
  description: 'Live offers from local shops and free parking near you. Now in Newham, London.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
