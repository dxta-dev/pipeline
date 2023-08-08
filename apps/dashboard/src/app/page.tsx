import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { MainNav } from "~/components/ui/main-nav";
import { GenerateToken } from "~/components/generate-token";

export default function Page() {
  return (
    <>
      <div className="flex-col">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <OrganizationSwitcher />
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </div>
      <GenerateToken />
    </>
  );
}
