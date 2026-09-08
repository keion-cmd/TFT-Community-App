export const metadata = {
  title: "TFT Community App — Admin",
  description: "Admin dashboard for the TFT Community App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
