-- Allow users to read their own role (was missing, causing role to always return null on frontend)
CREATE POLICY "users_read_own_role"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());
