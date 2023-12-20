"use client"
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import type { Tenant } from './tenant.env';
import { TenantPicker } from './tenant-picker';

type TransformStartFormProps = {
  TENANTS: Tenant[] | undefined
}
export function TransformStartForm({ TENANTS }: TransformStartFormProps) {
  const { getToken } = useAuth();
  const [tenantId, setTenantId] = useState((TENANTS || [])[0]?.id || -1);
  const [status, setStatus] = useState('---');
  const [body, setBody] = useState('');

  const handleClick = async () => {
    if (!process.env.NEXT_PUBLIC_TRANSFORM_API_URL) return console.error('Missing ENV variable: NEXT_PUBLIC_TRANSFORM_API_URL');
    if (tenantId === -1) return console.error(`Invalid ENV variable: TENANTS`);
    const requestBody = JSON.stringify({ tenantId });

    setStatus('...');
    setBody('');

    const token = await getToken({ template: 'dashboard' });
    if (!token) return;

    const res = await fetch(process.env.NEXT_PUBLIC_TRANSFORM_API_URL, {
      method: 'post',
      body: requestBody,
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
      <div>tenant: <span className="inline-block"><TenantPicker tenants={TENANTS} setTenantId={setTenantId} /></span></div>
      </div>
      <div><b>{status}</b></div>
      <pre>{body}</pre>
    </>
  );

}
