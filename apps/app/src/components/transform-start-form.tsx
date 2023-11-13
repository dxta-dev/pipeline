"use client"
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';


export function TransformStartForm() {
  const { getToken } = useAuth();
  const [status, setStatus] = useState('---');
  const [body, setBody] = useState('');

  const handleClick = async () => {
    if (!process.env.NEXT_PUBLIC_TRANSFORM_API_URL) return console.error('Missing ENV variable: NEXT_PUBLIC_TRANSFORM_API_URL');
    setStatus('...');
    setBody('');

    const token = await getToken({ template: 'dashboard' });
    if (!token) return;

    const res = await fetch(process.env.NEXT_PUBLIC_TRANSFORM_API_URL, {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    const jsonBody = await res.json() as unknown;
    setStatus(res.status.toString());
    setBody(JSON.stringify(jsonBody, null, 2));

  };


  return (
    <>
      <div>
        <button onClick={() => { handleClick().catch(console.log) }}>
          Transform
        </button>
      </div>
      <div><b>{status}</b></div>
      <pre>{body}</pre>
    </>
  );

}
