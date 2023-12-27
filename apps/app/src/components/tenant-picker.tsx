"use client"
import type { ChangeEvent } from "react";
import type { Tenant } from "./tenant.env";

type TenantPickerProps = {
  tenants: Tenant[] | undefined
  setTenantId: (tenantId: number) => void;
}
export function TenantPicker({ tenants, setTenantId }: TenantPickerProps) {

  if (tenants === undefined) return (<span style={{color: 'red'}}>Invalid environment varibale: TENANTS</span>);

  if (tenants.length === 0) return (<span style={{color: 'blue'}}>Empty tenancy config</span>);

  const handleSelectChange = (ev: ChangeEvent<HTMLSelectElement>) => setTenantId(Number(ev.target.value));

  return (
    <select defaultValue={tenants[0]?.id} onChange={handleSelectChange} className='flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'>
      {tenants.map(t=>(
        <option key={t.id} value={t.id}>{t.tenant}</option>
      ))}
    </select>
  );

}
