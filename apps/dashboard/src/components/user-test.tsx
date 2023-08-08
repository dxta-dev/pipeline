"use client";
import { useUser } from "@clerk/clerk-react";

export default function Home() {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <pre>{JSON.stringify(user, null, 2)}</pre>;
  }

  return <div>Not signed in</div>;
}


