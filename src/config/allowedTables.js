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
    sourceKey: "allLabs",
    label: "All Labs",
    labTable: "Labs",
    testTable: "LabProducts",
    labIdColumn: "LabId",
    testLabIdColumn: "labId",
    testColumns: ["ProductID", "labId", "Products", "Tests", "TestMethod"],
    searchableTestColumns: ["Products", "Tests", "TestMethod"],
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
      "LabType",
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
