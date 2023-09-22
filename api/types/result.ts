export interface Result {
  id: string;
  status: "PENDING" | "COMPLETED"; // initially pending
  questions: string[]; // present is requirements have QUERIES
  responses?: any[];
  jobId?: string; // allocated during textract run
  requirements: ("TABLES" | "FORMS" | "QUERIES" | "SIGNATURES")[]; // what to analyze
}
