// src/types/plan.ts

export type SectionName =
  | "History"
  | "PSFH/ROS"
  | "V & P"
  | "Exam"
  | "Diagnostics"
  | "Imp/Plan"
  | "Follow Up";

export type HistorySubsection = "CC" | "HPI" | "Extended HPI" | "Mental Status Exam";
export type PSFHSubsection = "PMHx";

export type Action =
  | {
      type: "insert_text";
      field:
        | "CC"
        | "HPI"
        | "Extended HPI"
        | "Mental Status Exam"
        | "Exam"
        | "Diagnostics"
        | "Imp/Plan"
        | "Follow Up";
      value: string;
    }
  | { type: "add_condition"; condition: string; codeSystem?: "ICD10" | "SNOMED"; code?: string }
  | { type: "set_vital"; vital: "BP" | "HR" | "RR" | "Temp" | "SpO2" | "Pain"; value: string };

export type Command =
  | { name: "sf-insert-CCs"; params: { finding: string; location?: string } }
  | { name: "sf-insert-extended-hpi"; params: { text: string } }
  | { name: "sf-insert-mental-status"; params: { text: string } }
  | { name: "sf-insert-psfhros"; params: { conditionsToSelect: string[] } }
  | { name: "sf-insert-exam"; params: { text: string } }
  | { name: "sf-insert-diagnostics"; params: { text: string } }
  | { name: "sf-insert-impplan"; params: { text: string } }
  | { name: "sf-insert-followup"; params: { text: string } };

export interface PlanItem {
  target_section: SectionName;
  subsection?: HistorySubsection | PSFHSubsection | string;
  actions: Action[];
  commands: Command[];
  rationale?: string;
  confidence?: number; // 0..1
  selected: boolean; // default true
}

export interface Plan {
  source: "speech" | "text";
  raw_input: string;
  items: PlanItem[];
  warnings?: string[];
}
