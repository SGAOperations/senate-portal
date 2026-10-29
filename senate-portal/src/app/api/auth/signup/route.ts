import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { UsersService } from '@/users/users.service';
import { RoleType } from '@/generated/prisma';

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName, nuid, roleId } =
      await request.json();

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !nuid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();

    // Use the request origin so verification links go to the same host
    const origin = new URL(request.url).origin;
    const emailRedirectTo = `${origin}/login`;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 },
      );
    }

    // Get roleId - default to MEMBER if not provided
    let finalRoleId = roleId;
    if (!finalRoleId) {
      finalRoleId = await UsersService.getRoleIdByRoleType(RoleType.MEMBER);
      if (!finalRoleId) {
        // Try to create the MEMBER role if it doesn't exist
        try {
          const newRole = await prisma.role.create({
            data: { roleType: RoleType.MEMBER },
          });
          finalRoleId = newRole.roleId;
        } catch {
          return NextResponse.json(
            {
              error:
                'Failed to get or create default role. Please contact an administrator.',
            },
            { status: 500 },
          );
        }
      }
    }

    // Create user profile in Prisma with Supabase user ID
    try {
      const userProfile = await prisma.user.create({
        data: {
          supabaseAuthId: authData.user.id, // Store Supabase auth ID
          email,
          firstName,
          lastName,
          nuid,
          roleId: finalRoleId,
          password: undefined, // Optional - Supabase handles authentication
        },
        include: {
          role: true,
        },
      });

      return NextResponse.json(
        {
          message: 'User created successfully',
          user: userProfile,
        },
        { status: 201 },
      );
    } catch (dbError: any) {
      // Handle Prisma unique constraint violations
      if (dbError?.code === 'P2002') {
        const target = dbError?.meta?.target;
        if (Array.isArray(target)) {
          if (target.includes('email')) {
            return NextResponse.json(
              { error: 'An account with this email already exists' },
              { status: 400 },
            );
          }
          if (target.includes('nuid')) {
            return NextResponse.json(
              { error: 'An account with this NUID already exists' },
              { status: 400 },
            );
          }
          if (target.includes('supabaseAuthId')) {
            return NextResponse.json(
              {
                error: 'An account with this authentication ID already exists',
              },
              { status: 400 },
            );
          }
        }
        return NextResponse.json(
          { error: 'A user with this information already exists' },
          { status: 400 },
        );
      }
      // Re-throw to be caught by outer catch block
      throw dbError;
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create user',
      },
      { status: 500 },
    );
  }
}
