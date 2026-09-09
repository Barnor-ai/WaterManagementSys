/*
# Lock subscription helper functions to signed-in users

1. Purpose
- Removes anonymous API execution from the subscription helper functions added for billing and plan enforcement.

2. Security
- `get_my_subscription` and `organization_subscription_allows` are callable only by authenticated users.
- Anonymous clients cannot probe subscription state or plan limits through the REST RPC endpoint.

3. Important notes
- Existing tenant access and authenticated application behavior are unchanged.
- No data is modified.
*/

REVOKE EXECUTE ON FUNCTION public.get_my_subscription() FROM anon;
REVOKE EXECUTE ON FUNCTION public.organization_subscription_allows(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.organization_subscription_allows(uuid, text) TO authenticated;
