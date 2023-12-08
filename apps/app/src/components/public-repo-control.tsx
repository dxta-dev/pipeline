"use client"
import { useAuth } from '@clerk/nextjs';
import { type ChangeEvent, useState } from 'react';

import { PUBLIC_REPOS, type PublicRepo } from "@acme/public-repos"

type PublicRepoCardProps = {
  repo: (PublicRepo & {forgeType: 'github'})
}
const PublicRepoCard = ({ repo }: PublicRepoCardProps) => {
  const { getToken } = useAuth();
  const [status, setStatus] = useState('---');
  const [daysAgo, setDaysAgo] = useState('1');

  const handleSelectChange = (ev: ChangeEvent<HTMLSelectElement>) => setDaysAgo(ev.target.value);


  const onExtractClick = async ()=> {
    if (!process.env.NEXT_PUBLIC_EXTRACT_API_URL) return console.error('Missing ENV variable: NEXT_PUBLIC_EXTRACT_API_URL');
    setStatus('...');

    const token = await getToken({ template: 'dashboard' });
    if (!token) return;

    const now = new Date();
    const extractPeriodStart = new Date(now.getTime() - (Number(daysAgo) * 24 * 60 * 60 * 1000));

    const requestBody = JSON.stringify({
      repositoryId: 0,
      repositoryName: repo.name,
      namespaceName: repo.owner, sourceControl: repo.forgeType,
      from: extractPeriodStart,
      to: now
    });

    const res = await fetch(process.env.NEXT_PUBLIC_EXTRACT_API_URL, {
      method: 'post',
      body: requestBody,
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    setStatus(res.status.toString());
  }

  return (
    <div className="inline-block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 m-2">
      <a href={repo.webUrl}>
        <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">{repo.name}</h5>
      </a>
      <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">{repo.owner}</p>
      <label htmlFor="xtperiod" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Extract period</label>
      <select defaultValue={daysAgo} onChange={handleSelectChange} id="xtperiod" className="my-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
        <option value="1">24 hours</option>
        <option value="7">7 days</option>
        <option value="30">30 days</option>
        <option value="90">90 days</option>
        <option value="360">360 days</option>
      </select>
      
      <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">Status: {status}</p>
      <button onClick={() => { onExtractClick().catch(console.log) }} type="button" className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800">Extract</button>
      {/* NO PERIOD FOR TRANSFORM EXISTS, OR PER REPOSITORY */}
      {/* <button type="button" className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">Transform</button> */}
    </div>
  )
}

export function PublicRepoControl() {

  return (<>
    <div className="container mx-auto">
      <div className="mb-2 text-4xl font-bold tracking-tight text-gray-900 text-center dark:text-white">Public Repositories</div>
      {PUBLIC_REPOS.filter(repo => repo.forgeType === 'github').map((repo, idx) => (<PublicRepoCard key={idx} repo={repo} />))}
    </div>
  </>)
}