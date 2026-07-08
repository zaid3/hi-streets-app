import './globals.css'
export const metadata={title:'Hi-Streets UK',description:'Find parking bays, restrictions and live local offers nearby'}
export const viewport={width:'device-width',initialScale:1,maximumScale:1,userScalable:false,viewportFit:'cover'}
export default function RootLayout({children}){
  return(
    <html lang="en">
      <body style={{margin:0,padding:0,height:'100dvh',overflow:'hidden',background:'#f7f6fc'}}>
        {children}
      </body>
    </html>
  )
}
