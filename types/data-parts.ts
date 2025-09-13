import { Source } from "@types";

export interface SourceData {
  type: "sources";
  sources: Source[];
}

export interface ModelData {
  type: "model";
  model: string;
}

export interface KeywordsData {
  type: "keywords";
  keywords: string[];
}

export type ChatDataParts = {
  sources: SourceData;
  model: ModelData;
  keywords: KeywordsData;
};
