import { LabProfile } from '../entities/LabProfile';

export interface ILabProfileRepository {
  get(): Promise<LabProfile | null>;
  save(profile: LabProfile, transaction?: any): Promise<void>;
}
