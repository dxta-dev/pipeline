"use client"
import { useAuth } from '@clerk/nextjs';


export function GenerateToken() {
  const { getToken } = useAuth();
  const handleClick = async () => {
    const token = await getToken({ template: 'dashboard' });
    console.log(token);
  };


  return (
    <button onClick={() => { handleClick().catch(console.log) }}>
      Generate Token
    </button>
  );

}
