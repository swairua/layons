# User Management Setup Guide

This guide explains how to complete the user management implementation with full support for creating and deleting users.

## Current Status

✅ **Completed:**
- UserManagement page fixed and loads without errors
- User invitation system (invite via email)
- User role and status editing
- Pending invitations management
- Error handling and user-friendly messages

⏳ **Pending:**
- Direct user creation via Supabase admin API
- User deletion via Supabase admin API
- Email sending for invitations

## Architecture Overview

The application is currently limited to frontend operations only. To enable full user management, you need backend functions with admin privileges.

### Option 1: Supabase Edge Functions (Recommended)

Supabase Edge Functions are serverless functions that can use the admin client with service role key.

#### Step 1: Set up Edge Functions directory

Create the necessary directory structure:

```bash
mkdir -p supabase/functions/create-user
mkdir -p supabase/functions/delete-user
mkdir -p supabase/functions/send-invitation
```

#### Step 2: Create user creation function

Create `supabase/functions/create-user/index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name?: string;
  company_id: string;
  role: string;
  phone?: string;
  department?: string;
  position?: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Initialize admin client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the request is from an authenticated admin user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" || profile?.company_id !== (await req.json()).company_id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin privileges required" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const data: CreateUserRequest = await req.json();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password || generateTemporaryPassword(),
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
      },
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Update user profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        role: data.role,
        phone: data.phone,
        company_id: data.company_id,
        department: data.department,
        position: data.position,
        status: "active",
      })
      .eq("id", authData.user.id);

    if (profileError) {
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: authData.user,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
```

#### Step 3: Create user deletion function

Create `supabase/functions/delete-user/index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  userId: string;
  company_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Initialize admin client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the request is from an authenticated admin user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    const data: DeleteUserRequest = await req.json();

    if (profile?.role !== "admin" || profile?.company_id !== data.company_id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin privileges required" }),
        { status: 403, headers: corsHeaders }
      );
    }

    if (user.id === data.userId) {
      return new Response(
        JSON.stringify({ error: "Cannot delete yourself" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Delete user from auth (cascades to profiles via foreign key)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(data.userId);

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

#### Step 4: Create invitation email function

Create `supabase/functions/send-invitation/index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInvitationRequest {
  email: string;
  company_name: string;
  company_id: string;
  invitation_token: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const data: SendInvitationRequest = await req.json();

    // Build invitation link
    const invitationLink = `${Deno.env.get("VITE_APP_URL")}/accept-invitation?token=${data.invitation_token}`;

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // Example with Resend:
    // const response = await fetch("https://api.resend.com/emails", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
    //   },
    //   body: JSON.stringify({
    //     from: "noreply@yourdomain.com",
    //     to: data.email,
    //     subject: `You're invited to ${data.company_name}`,
    //     html: `
    //       <h1>Welcome to ${data.company_name}</h1>
    //       <p>You've been invited to join our team. Click the link below to accept:</p>
    //       <a href="${invitationLink}">Accept Invitation</a>
    //       <p>This link expires in 7 days.</p>
    //     `,
    //   }),
    // });

    // For now, return success
    return new Response(
      JSON.stringify({ success: true, invitationLink }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

### Step 5: Update useUserManagement hook

Update the `createUser` and `deleteUser` functions in `src/hooks/useUserManagement.ts`:

```typescript
// Create a new user (admin only)
const createUser = async (userData: CreateUserData): Promise<{ success: boolean; error?: string }> => {
  if (!isAdmin || !currentUser?.company_id) {
    return { success: false, error: 'Unauthorized' };
  }

  setLoading(true);

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          ...userData,
          company_id: currentUser.company_id,
          password: generateTemporaryPassword(),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }

    toast.success('User created successfully');
    await fetchUsers();
    return { success: true };
  } catch (err) {
    const errorMessage = parseErrorMessageWithCodes(err, 'user creation');
    console.error('Error creating user:', err);
    toast.error(`Failed to create user: ${errorMessage}`);
    return { success: false, error: errorMessage };
  } finally {
    setLoading(false);
  }
};

// Delete user (admin only)
const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  if (!isAdmin || userId === currentUser?.id) {
    return { success: false, error: 'Cannot delete yourself or unauthorized' };
  }

  setLoading(true);

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          userId,
          company_id: currentUser?.company_id,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete user');
    }

    toast.success('User deleted successfully');
    await fetchUsers();
    return { success: true };
  } catch (err) {
    const errorMessage = parseErrorMessageWithCodes(err, 'user deletion');
    console.error('Error deleting user:', err);
    toast.error(`Failed to delete user: ${errorMessage}`);
    return { success: false, error: errorMessage };
  } finally {
    setLoading(false);
  }
};
```

### Step 6: Deploy Edge Functions

Deploy using Supabase CLI:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Deploy functions
supabase functions deploy create-user
supabase functions deploy delete-user
supabase functions deploy send-invitation
```

## Option 2: External Backend API

If you prefer to use an external backend (Node.js, Python, Go, etc.), follow the same API contract:

- `POST /api/users/create` - Create a new user
- `DELETE /api/users/{userId}` - Delete a user
- `POST /api/users/send-invitation` - Send invitation email

## Testing

Once Edge Functions are deployed:

1. Sign in as an admin user
2. Navigate to Settings > Users
3. Click "Add User" (should now be enabled)
4. Fill in user details and submit
5. The user should be created in Supabase Auth and Profiles table

## Email Integration

For sending invitation emails, integrate with a service like:

- **Resend** - Best for modern apps
- **SendGrid** - Industry standard
- **AWS SES** - Cost-effective
- **Mailgun** - Developer-friendly
- **Postmark** - High deliverability

Add your email service API key as a Supabase secret:

```bash
supabase secrets set RESEND_API_KEY "your-api-key"
```

## Security Considerations

1. **Authentication Check** - Always verify the request is from an authenticated user
2. **Authorization Check** - Verify the user is an admin in the same company
3. **Rate Limiting** - Implement rate limiting on Edge Functions
4. **Input Validation** - Validate all input data before processing
5. **Audit Logging** - Log all user management operations
6. **HTTPS Only** - Ensure all communications are over HTTPS

## Troubleshooting

### "Failed to fetch dynamically imported module"

This error occurs when the Edge Functions are not accessible or have a runtime error. Check:

- Edge Functions are deployed
- Environment variables are set correctly
- Function syntax is correct (Deno compatibility)

### "Unauthorized - Admin privileges required"

Ensure:

- User is logged in
- User has admin role
- Token is properly passed in Authorization header
- User company_id matches the request company_id

### Email not sending

Ensure:

- Email service API key is set as a Supabase secret
- Email service account is properly configured
- From address is verified in email service

## Next Steps

1. Set up Supabase CLI on your local machine
2. Create the Edge Functions as documented above
3. Deploy to your Supabase project
4. Test the user management workflow
5. Configure your email service for sending invitations

For more information, refer to:

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/admin-api)
- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
