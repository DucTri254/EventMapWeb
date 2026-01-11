import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const regions = await prisma.region.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(regions);
  } catch (error) {
    console.error('Get regions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
