import { describe, expect, it, vi } from "vitest";
import { EquipmentCategory } from "../../../domain/entities/EquipmentCategory";
import { UpdateEquipmentCategoryUseCase } from "./UpdateEquipmentCategoryUseCase";

function fixture() {
  const category = EquipmentCategory.create({
    code: "IOT",
    name: "IoT",
    description: "Old",
  });
  const repo = {
    findById: vi.fn(async () => category as EquipmentCategory | null),
    findByCode: vi.fn(async () => null as EquipmentCategory | null),
    list: vi.fn(),
    save: vi.fn(),
    update: vi.fn(async () => true),
    delete: vi.fn(),
  };
  return { category, repo, useCase: new UpdateEquipmentCategoryUseCase(repo) };
}
const input = {
  code: "NEW-IOT",
  name: "Thiết bị IoT",
  description: "Mô tả mới",
};
describe("UpdateEquipmentCategoryUseCase", () => {
  it("updates all editable fields without changing category identity or creating a new category", async () => {
    const { category, repo, useCase } = fixture();
    const id = category.id.toString();
    const result = await useCase.execute(id, input);
    expect(result.isSuccess).toBe(true);
    expect(result.getValue().id.toString()).toBe(id);
    expect(result.getValue().props).toMatchObject(input);
    expect(repo.update).toHaveBeenCalledWith(category);
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });
  it("allows keeping the current code and clearing the description", async () => {
    const { category, repo, useCase } = fixture();
    repo.findByCode.mockResolvedValue(category);
    const result = await useCase.execute(category.id.toString(), {
      ...input,
      code: " IOT ",
      description: "",
    });
    expect(result.isSuccess).toBe(true);
    expect(category.code).toBe("IOT");
    expect(category.description).toBe("");
  });
  it("rejects another category with the requested code without writing", async () => {
    const { category, repo, useCase } = fixture();
    repo.findByCode.mockResolvedValue(EquipmentCategory.create(input));
    const result = await useCase.execute(category.id.toString(), input);
    expect(result.getError()).toContain("đã tồn tại");
    expect(repo.update).not.toHaveBeenCalled();
  });
  it.each([
    { ...input, code: " " },
    { ...input, name: " " },
    { ...input, code: "X".repeat(51) },
    { ...input, name: "X".repeat(256) },
    { ...input, description: "X".repeat(501) },
  ])("rejects invalid input before database access", async (invalid) => {
    const { category, repo, useCase } = fixture();
    expect(
      (await useCase.execute(category.id.toString(), invalid)).isFailure,
    ).toBe(true);
    expect(repo.findById).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });
  it("rejects invalid category IDs", async () => {
    const { repo, useCase } = fixture();
    expect((await useCase.execute("invalid", input)).isFailure).toBe(true);
    expect(repo.findById).not.toHaveBeenCalled();
  });
  it("does not recreate a category deleted before or during editing", async () => {
    const { category, repo, useCase } = fixture();
    repo.findById.mockResolvedValueOnce(null);
    expect(
      (await useCase.execute(category.id.toString(), input)).isFailure,
    ).toBe(true);
    repo.update.mockResolvedValue(false);
    expect(
      (await useCase.execute(category.id.toString(), input)).isFailure,
    ).toBe(true);
    expect(repo.save).not.toHaveBeenCalled();
  });
  it("reports racing SQL unique constraint violations in Vietnamese", async () => {
    const { category, repo, useCase } = fixture();
    repo.update.mockRejectedValueOnce({ number: 2627 });
    expect(
      (await useCase.execute(category.id.toString(), input)).getError(),
    ).toContain("Mã danh mục đã tồn tại");
  });
});
