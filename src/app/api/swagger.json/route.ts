import { NextResponse } from 'next/server';
import { openApiSpec } from '@/swagger/openapi-spec';

export async function GET() {
  return NextResponse.json(openApiSpec);
}
