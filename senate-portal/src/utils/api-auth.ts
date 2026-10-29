import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Get the current authenticated user from Supabase session
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      return null;
    }

    // Get user from Prisma by supabaseAuthId
    const user = await prisma.user.findUnique({
      where: { supabaseAuthId: session.user.id },
      include: { role: true },
    });

    return user;
  } catch (error) {
    //console.error('Error getting authenticated user:', error);
    if (error) {
      return null;
    }
  }
}

/**
 * Middleware helper to protect API routes
 * Returns the authenticated user or an error response
 */
export async function requireAuth() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { user, error: null };
}
