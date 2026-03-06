import { NextResponse } from 'next/server';
import { calculatePropertyResult } from '@/lib/calculations';
import { propertyInputSchema } from '@/lib/validators/real-estate-schema';

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const parseResult = propertyInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: parseResult.error.issues,
        },
        { status: 400 },
      );
    }

    const result = calculatePropertyResult(parseResult.data);

    return NextResponse.json({
      data: result,
      meta: {
        lastUpdated: new Date().toISOString().split('T')[0],
        source: 'calculator',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      {
        error: message,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}
