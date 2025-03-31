export interface TrafficTicket {
    id: number;
    user_id: string; // UUID type
    license_plate: string;
    violation_type: string;
    fine_amount: number;
    date_issued: string; // Timestamp string (ISO 8601)
    status: 'unpaid' | 'paid';
}
