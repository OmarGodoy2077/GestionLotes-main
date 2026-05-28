import type { Project, Block, Lot } from "@prisma/client";

export type ProjectDto = Project;
export type BlockDto = Block;
export type LotDto = Lot;

export type ProjectWithBlocks = Project & { blocks: Block[] };
export type BlockWithLots = Block & { lots: Lot[] };
