export const labTypeOptions = [
  "Biological",
  "Chemical",
  "Electrical",
  "Electronics",
  "Forensic",
  "Mechanical",
  "Non-destructive",
  "Photometry",
  "Radiological"
];

export const searchSources = [
  {
    sourceKey: "biological",
    label: "Biological Source",
    labTable: "BioLabs",
    testTable: "BioTests",
    labIdColumn: "LabId",
    testLabIdColumn: "labid",
    testColumns: ["id", "product", "test", "method", "labid"],
    searchableTestColumns: ["product", "test", "method", "labid"],
    labColumns: [
      "LabId",
      "LaboratoryName",
      "ContactEmail",
      "ContactMobile",
      "LandLine",
      "PrimeAddress",
      "City",
      "State",
      "Pin",
      "disciplineName"
    ]
  },
  {
    sourceKey: "chemical",
    label: "Chemical Source",
    labTable: "ChemicalLabs",
    testTable: "ChemicalTests",
    labIdColumn: "labId",
    testLabIdColumn: "labId",
    testColumns: ["id", "product", "test", "method", "labId"],
    searchableTestColumns: ["product", "test", "method", "labId"],
    labColumns: [
      "labId",
      "LaboratoryName",
      "ContactEmail",
      "ContactMobile",
      "LandLine",
      "PrimeAddress",
      "City",
      "State",
      "Pin",
      "disciplineName"
    ]
  }
];

export const sharedColumns = {
  resultColumns: [
    "Sr. No",
    "Lab Name",
    "Address",
    "State",
    "Phone Number",
    "Email"
  ],
  searchableLabColumns: [
    "labId",
    "LaboratoryName",
    "City",
    "State",
    "disciplineName",
    "ContactPerson"
  ]
};

export function createFilterFields() {
  return {
    state: {
      label: "State",
      column: "State",
      type: "dropdown",
      operator: "eq"
    },
    city: {
      label: "City",
      column: "City",
      type: "text",
      operator: "ilike"
    },
    labName: {
      label: "Lab Name",
      column: "LaboratoryName",
      type: "text",
      operator: "ilike"
    },
    product: {
      label: "Product",
      column: "product",
      type: "text",
      operator: "ilike"
    },
    test: {
      label: "Test",
      column: "test",
      type: "text",
      operator: "ilike"
    },
    testMethod: {
      label: "Test + Method",
      columns: ["test", "method"],
      type: "text",
      operator: "or-ilike"
    }
  };
}

export function getPublicSearchConfig() {
  return {
    label: "All Labs",
    description:
      "Searches biological and chemical lab sources together while lab type works as a filter.",
    columns: sharedColumns.resultColumns,
    filterFields: createFilterFields(),
    labTypeOptions,
    defaultLimit: 50,
    defaultSort: {
      column: "Lab Name",
      ascending: true
    }
  };
}
