import { UserButton } from "@clerk/nextjs";


export default function Page() {
  return (
    <>
      <div className="bg-red-500">Hello</div>
    <div>
      <h1>Page</h1>
      <p>Page content</p>
      <UserButton afterSignOutUrl="/" />
    </div>
    </>
  );
}
