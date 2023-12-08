import '~/global.css';
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from '~/components/ui/theme-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
          <body>
        <ThemeProvider attribute="class" defaultTheme="light">
            {children}
        </ThemeProvider>
          </body>
      </html>
    </ClerkProvider>
  );
}
