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
      "disciplineName",
      "groupName"
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
      "disciplineName",
      "groupName"
    ]
  }
];

export const sharedColumns = {
  resultColumns: [
    "Sr. No",
    "Lab Name",
    "Address",
    "State",
    "Discipline Name", // Added Discipline Name
    "Group Name", // Added Group Name
    "Details" // Placeholder for the icon column
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
    defaultLimit: 10,
    defaultSort: {
      column: "Lab Name",
      ascending: true
    }
  };
}
