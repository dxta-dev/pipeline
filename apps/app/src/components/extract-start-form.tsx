"use client"
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';


export function ExtractStartForm() {
  const { getToken } = useAuth();
  const [repositoryId, setRepositoryId] = useState(0);
  const [repositoryName, setRepositoryName] = useState('');
  const [namespaceName, setNamespaceName] = useState('');
  const [sourceControl, setSourceControl] = useState('gitlab');
  const [status, setStatus] = useState('---');
  const [body, setBody] = useState('');

  const handleInputChange = (stateSetter: Dispatch<SetStateAction<any>>) => (ev: ChangeEvent<HTMLInputElement>) => stateSetter(ev.target.value);
  const handleSelectChange = (ev: ChangeEvent<HTMLSelectElement>) => setSourceControl(ev.target.value);

  const handleSubmit = async () => {
    if (!process.env.NEXT_PUBLIC_EXTRACT_API_URL) return console.error('Missing ENV variable: NEXT_PUBLIC_EXTRACT_API_URL')
    setStatus('...');
    setBody('');

    const token = await getToken({ template: 'dashboard' });
    if (!token) return;
    const res = await fetch(process.env.NEXT_PUBLIC_EXTRACT_API_URL, {
      method: 'post',
      body: JSON.stringify({ repositoryId, repositoryName, namespaceName, sourceControl }),
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
        <div>
          <label>
            repositoryId:
            <input type="text" value={repositoryId} onChange={handleInputChange((v) => setRepositoryId(Number(v)))} />
          </label>
        </div>
        <div>
          <label>
            repositoryName:
            <input type="text" value={repositoryName} onChange={handleInputChange(setRepositoryName)} />
          </label>
        </div>
        <div>
          <label>
            namespaceName:
            <input type="text" value={namespaceName} onChange={handleInputChange(setNamespaceName)} />
          </label>
        </div>
        <div>
          <label>
            sourceControl:
            <select defaultValue={sourceControl} onChange={handleSelectChange}>
              <option value='gitlab'>gitlab</option>
              <option value='github'>github</option>
            </select>
          </label>
        </div>
        <button onClick={() => void handleSubmit()}>Submit</button>
      </div>
      <div><b>{status}</b></div>
      <pre>{body}</pre>
    </>

  );

}
