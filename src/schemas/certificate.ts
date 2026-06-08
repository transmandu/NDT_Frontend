export interface ResultRow {
    label: string;
    nominal: number;
    reading: number;
    error: number;
    correction: number;
    expanded_u: number;
    emp: number | null;
    conforms: boolean | null;
    unit: string;
}

export interface StantardRow {
    name: string;
    brand?: string;
    serial_number: string;
    certificate_number: string;
    valid_until?: string;
    uncertainty_u: number;
    unit: string;
}

export interface VerificationResponse {
    found: boolean;
    message?: string;
    cert?: {
        certificate_number: string;
        status: string;
        generated_at: string;
        calibration_date: string;
        next_calibration_date: string;
        conforms: boolean | null;
        conformity_label: string;
        issuer_name: string;
        issuer_title: string;
        approver_name: string;
        approver_title: string;
    };
    instrument?: {
        name: string;
        brand: string;
        model: string;
        serial_number: string;
        internal_code: string;
        range: string;
        resolution: string;
        unit: string;
        emp: number | null;
    };
    procedure?: {
        name: string;
        code: string;
    };
    environment?: {
        temperature: number;
        temperature_unc: number;
        humidity: number;
        pressure: number | null;
    };
    results?: ResultRow[];
    standards?: StantardRow[];
    technician?: string;
    auditor?: string;
    observation?: string;
    hash?: {
        stored: string;
        computed: string;
        matches: boolean;
    };
    laboratory?: {
        name: string;
        address: string;
        city: string;
        accreditation_no: string;
        iso_accreditation: string;
    };
}