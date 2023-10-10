"use client"
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { Input } from './ui/input';


export function ExtractStartForm() {
  const { getToken } = useAuth();
  const currentDate = new Date();
  currentDate.setMonth(currentDate.getMonth() - 6);
  const defaultFromDate = currentDate.toISOString().slice(0, 10);
  const [repositoryId, setRepositoryId] = useState(0);
  const [repositoryName, setRepositoryName] = useState('');
  const [namespaceName, setNamespaceName] = useState('');
  const [sourceControl, setSourceControl] = useState('gitlab');
  const [from, setFrom] = useState(defaultFromDate);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('---');
  const [body, setBody] = useState('');

  const handleInputChange = (stateSetter: Dispatch<SetStateAction<any>>) => (ev: ChangeEvent<HTMLInputElement>) => stateSetter(ev.target.value);

  const handleSelectChange = (ev: ChangeEvent<HTMLSelectElement>) => setSourceControl(ev.target.value);

  const handleSubmit = async () => {
    if (!process.env.NEXT_PUBLIC_EXTRACT_API_URL) return console.error('Missing ENV variable: NEXT_PUBLIC_EXTRACT_API_URL');
    setStatus('...');
    setBody('');
  
    const token = await getToken({ template: 'dashboard' });
    if (!token) return;
  
    const requestBody = JSON.stringify({ repositoryId, repositoryName, namespaceName, sourceControl, from: new Date(from), to: new Date(to) });
  
    console.log('Request Body:', requestBody); 
  
    const res = await fetch(process.env.NEXT_PUBLIC_EXTRACT_API_URL, {
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
        <table>
          <tbody>

            <tr>
              <td>repositoryId:</td>
              <td><Input className='w-[200px] inline-block' type="text" value={repositoryId} onChange={handleInputChange((v) => setRepositoryId(Number(v)))} /></td>
            </tr>
            <tr>
              <td>repositoryName:</td>
              <td><Input className='w-[200px] inline-block' type='text' value={repositoryName} onChange={handleInputChange(setRepositoryName)} /></td>
            </tr>
            <tr>
              <td>namespaceName:</td>
              <td><Input className='w-[200px] inline-block' type="text" value={namespaceName} onChange={handleInputChange(setNamespaceName)} /></td>
            </tr>
            <tr>
              <td>sourceControl:</td>
              <td>
                <select defaultValue={sourceControl} onChange={handleSelectChange} className='flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'>
                  <option value='gitlab'>gitlab</option>
                  <option value='github'>github</option>
                </select>
              </td>
            </tr>
            <tr>
              <td>From</td>
              <td>To</td>
            </tr>
            <tr>
              <td><input type='date' value={from} onChange={handleInputChange(setFrom)} className='flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50' /></td>
              <td><input type='date' value={to} onChange={handleInputChange(setTo)} className='flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50' /></td>
            </tr>
          </tbody>
        </table>
        <button onClick={() => void handleSubmit()}>Submit</button>
      </div>
      <div><b>{status}</b></div>
      <pre>{body}</pre>
    </>

  );

}
