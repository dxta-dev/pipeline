import { fuzzySearch } from './fuzzy'


const gitIdentities = [
    { id: 1, repositoryId: 1, name: 'GitHub', email: 'noreply@github.com', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
    { id: 2, repositoryId: 1, name: 'dejan-crocoder', email: 'dejan@crocoder.dev', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
    { id: 3, repositoryId: 1, name: 'David Abram', email: 'david@crocoder.dev',_createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
    { id: 4, repositoryId: 1, name: 'Dejan Tot', email: '139872861+dejan-crocoder@users.noreply.github.com', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
    { id: 5, repositoryId: 1, name: 'Ante Koceić', email: 'ante@crocoder.dev', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
    { id: 6, repositoryId: 1, name: 'ivke995', email: 'ivanivic842@gmail.com',_createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  ];
  
  const members = [
    { id: 1, externalId: 6842718, name: 'danicapivalicaabram', username: 'danicapivalicaabram', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02')},
    { id: 2, externalId: 7620347, name: 'davidabram', username: 'davidabram', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
    { id: 3, externalId: 17670202, name: 'IvanPenga', username: 'IvanPenga', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02')},
    { id: 4, externalId: 68769671, name: 'stefanskoricdev', username: 'stefanskoricdev', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
    { id: 5, externalId: 71839055, name: 'crocoder-bot', username: 'crocoder-bot', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
    { id: 6, externalId: 79873689, name: 'sesar002', username: 'sesar002', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
    { id: 7, externalId: 95020322, name: 'vele616', username: 'vele616', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
    { id: 8, externalId: 97022082, name: 'Ante-Koceic', username: 'Ante-Koceic', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
    { id: 9, externalId: 100783701, name: 'marijaduvnjak', username: 'marijaduvnjak', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
    { id: 10, externalId: 103996436, name: 'ivke995', username: 'ivke995', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
    { id: 11, externalId: 122017510, name: 'gloriababic', username: 'gloriababic', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
    { id: 12, externalId: 139872861, name: 'dejan-crocoder', username: 'dejan-crocoder', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02')},
  ];