import { apiClient } from './api-client';
export type BookingStatus='DRAFT'|'PENDING'|'APPROVED'|'REJECTED'|'CANCELLED'|'CHECKED_IN'|'COMPLETED';
export type BookingType='FULL_LAB'|'COMPUTERS_ONLY'|'EQUIPMENT_ONLY';
export interface BookingData{id:string;requestCode:string;requesterId?:string;bookingType:BookingType;purpose:string;startTime:string;endTime:string;expectedReturnTime?:string|null;numberOfPeople:number;numberOfComputers:number;status:BookingStatus;isOverdue?:boolean;hasIncident?:boolean;note?:string|null;createdAt?:string;equipmentItems?:Array<{id:string;equipmentId:string;requestedQuantity:number;reservedQuantity:number;borrowedQuantity:number}>}
export interface CalendarEvent{id:string;title:string;start:string;end:string;type:BookingType;status:BookingStatus;requesterId?:string;numberOfPeople?:number}
export interface CreateBookingPayload{bookingType:BookingType;purpose:string;startTime:string;endTime:string;expectedReturnTime?:string|null;numberOfPeople:number;numberOfComputers:number;equipments:Array<{equipmentId:string;quantity:number}>;note?:string}
export const bookingApi={
 calendar:async(start:Date,end:Date):Promise<CalendarEvent[]>=>{const response=await apiClient.get('/bookings/calendar',{params:{start:start.toISOString(),end:end.toISOString()}});return response.data},
 myBookings:async():Promise<BookingData[]>=>{const response=await apiClient.get('/bookings/my-bookings');return response.data},
 pending:async():Promise<BookingData[]>=>{const response=await apiClient.get('/bookings/admin/pending');return response.data},
 create:async(payload:CreateBookingPayload)=>{const response=await apiClient.post('/bookings',payload);return response.data},
 approve:async(id:string)=>{const response=await apiClient.post(`/bookings/${id}/approve`);return response.data},
 reject:async(id:string,reason:string)=>{const response=await apiClient.post(`/bookings/${id}/reject`,{reason});return response.data},
 cancel:async(id:string,reason?:string)=>{const response=await apiClient.post(`/bookings/${id}/cancel`,{reason});return response.data},
};
