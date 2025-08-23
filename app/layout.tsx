export const metadata = {
  title: 'mini-v0',
  description: 'GPT code patches + PR + Vercel deploy'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#0b0b0c', color: '#e6e6e6' }}>
        {children}
      </body>
    </html>
  );
}
