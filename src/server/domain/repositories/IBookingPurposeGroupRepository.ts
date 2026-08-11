import { BookingPurposeGroup } from '../entities/BookingPurposeGroup';

export interface BookingPurposeSuggestion {
  id: string | null;
  name: string;
  usageCount: number;
  source: 'GROUP' | 'LEGACY';
}

export interface IBookingPurposeGroupRepository {
  findById(id: string): Promise<BookingPurposeGroup | null>;
  list(): Promise<BookingPurposeGroup[]>;
  listSuggestions(): Promise<BookingPurposeSuggestion[]>;
  save(group: BookingPurposeGroup, transaction?: any): Promise<void>;
  softDelete(id: string): Promise<void>;
}
