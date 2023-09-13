import { eq } from "drizzle-orm";
import type { ExtractEntities, TransformEntities, TransformFunction } from "./config";
import type { NewRepository as TransformedRepository } from "@acme/transform-schema";

export type SetRepositoryInput = {
  extractRepositoryId: number;
  forgeType: 'github' | 'gitlab'; // Question: which package should define supported forges -> this should be defined in extract db as well
}
export type SetRepositoryOutput = void;
export type SetRepositoryExtractEntities = Pick<ExtractEntities, 'repositories'>;
export type SetRepositoryTransformEntities = Pick<TransformEntities, 'repositories'>;

export type SetRepositoryFunction = TransformFunction<SetRepositoryInput, SetRepositoryOutput, SetRepositoryExtractEntities, SetRepositoryTransformEntities>;

export const setRepository: SetRepositoryFunction = async (
  { extractRepositoryId, forgeType },
  { extract, transform }
) => {

  const extractRepository = await extract.db.select().from(extract.entities.repositories)
    .where(eq(extract.entities.repositories.id, extractRepositoryId))
    .get();

  if (!extractRepository) throw new Error(`Repository doesn't exist: ${extractRepositoryId}`);

  const transformedRepository = {
    externalId: extractRepositoryId, // Question: do we need external ids in transform or only extract ids ?
    forgeType,
    name: extractRepository.name,
  } satisfies TransformedRepository;

  await transform.db.insert(transform.entities.repositories).values(transformedRepository)
    .onConflictDoNothing()
    .run();
}
