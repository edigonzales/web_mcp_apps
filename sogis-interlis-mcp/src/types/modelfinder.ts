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

export type ModelfinderContext = {
  mode: "url-embed";
  url: string;
  query: string | null;
  ilisite: string | null;
  expanded: boolean;
};

export type SearchInterlisModelsResult = {
  query: string;
  ilisite: string | null;
  expanded: boolean;
  url: string;
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
