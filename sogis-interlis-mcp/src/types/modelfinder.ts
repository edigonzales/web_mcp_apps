export type ModelfinderUrlInput = {
  query?: string | null;
  ilisite?: string | null;
  expanded?: boolean | null;
  nologo?: boolean | null;
};

export type ModelfinderContextInput = {
  query?: string | null;
  ilisite?: string | null;
  expanded?: boolean | null;
};

export type ModelfinderModel = {
  key: string;
  serverDisplayName: string;
  serverUrl: string;
  name: string;
  displayName: string;
  shortDescription: string;
  version: string;
  file: string;
  schemaLanguage: string;
  issuer: string;
  precursorVersion: string;
  technicalContact: string;
  furtherInformation: string;
  md5: string;
  tags: string;
  organisationName: string;
  organisationAbbreviation: string;
  detailUrl: string;
  umlUrl: string;
  fileUrl: string;
};

export type ModelfinderModelGroup = {
  serverDisplayName: string;
  modelCount: number;
  models: ModelfinderModel[];
};

export type ModelfinderSearchPayload = {
  url: string;
  query: string | null;
  ilisite: string | null;
  expanded: boolean;
  groups: ModelfinderModelGroup[];
  totalModelCount: number;
  selectedModel: ModelfinderModel | null;
};

export type ModelfinderContext = ModelfinderSearchPayload & {
  mode: "search-results";
};

export type SearchInterlisModelsResult = ModelfinderSearchPayload & {
  query: string;
  ui: {
    resource: string;
    params: {
      query: string;
      ilisite?: string;
      expanded: boolean;
      nologo: true;
    };
  };
  note: string;
};
