import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"WalletGraph — On-chain intelligence", description:"Track wallets, inspect verified activity, and route alerts to Discord." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
