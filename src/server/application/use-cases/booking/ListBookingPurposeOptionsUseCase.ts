import {
  BookingPurposeSuggestion,
  IBookingPurposeGroupRepository,
} from '../../../domain/repositories/IBookingPurposeGroupRepository';
import { normalizePurposeKey } from './purpose-normalization';

export class ListBookingPurposeOptionsUseCase {
  constructor(private purposeGroupRepo: IBookingPurposeGroupRepository) {}

  public async execute(): Promise<BookingPurposeSuggestion[]> {
    const suggestions = await this.purposeGroupRepo.listSuggestions();
    const canonicalKeys = new Set(
      suggestions
        .filter((suggestion) => suggestion.source === 'GROUP')
        .map((suggestion) => normalizePurposeKey(suggestion.name)),
    );
    const merged = new Map<string, BookingPurposeSuggestion>();

    suggestions.forEach((suggestion) => {
      if (suggestion.source === 'GROUP') {
        merged.set(`group:${suggestion.id}`, suggestion);
        return;
      }

      const key = normalizePurposeKey(suggestion.name);
      if (canonicalKeys.has(key)) return;
      const existing = merged.get(`legacy:${key}`);
      if (existing) {
        const previousUsageCount = existing.usageCount;
        existing.usageCount += suggestion.usageCount;
        if (suggestion.usageCount > previousUsageCount) existing.name = suggestion.name;
      } else {
        merged.set(`legacy:${key}`, { ...suggestion });
      }
    });

    return Array.from(merged.values()).sort((left, right) => right.usageCount - left.usageCount || left.name.localeCompare(right.name, 'vi'));
  }
}
