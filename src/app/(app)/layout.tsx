import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { SettingsStoreProvider, ComparisonStoreProvider } from '@/lib/stores/store-provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsStoreProvider>
      <ComparisonStoreProvider>
        <SidebarProvider defaultOpen={false}>
          <AppSidebar />
          <SidebarInset>
            <Header />
            <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-16">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </ComparisonStoreProvider>
    </SettingsStoreProvider>
  );
}
