"use client"
import { useAuth } from '@clerk/nextjs';


export function GenerateToken() {
const { getToken } = useAuth();


return (
  <button onClick={async () => console.log(await getToken({template: 'dashboard'}))}>
    Generate Token
  </button>
);

}
