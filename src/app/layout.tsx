import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
const bodyFont = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-dm-sans" });
const monoFont = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "600"], display: "swap", variable: "--font-ibm-plex-mono" });
export const metadata: Metadata = { title:"WalletGraph — On-chain intelligence", description:"Track wallets, inspect verified activity, and route alerts to Discord." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en" className={`${bodyFont.variable} ${monoFont.variable}`}><body>{children}</body></html>; }
