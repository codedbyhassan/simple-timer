import { AuthLayout, Heading, Stack, Text } from '@ui'

export default function ConfigMissingPage() {
  return (
    <AuthLayout>
      <Stack gap="xs">
        <Heading>Connection not set up</Heading>
        <Text tone="muted">This copy of Ascend HMS has no Supabase connection. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then build again.</Text>
      </Stack>
    </AuthLayout>
  )
}
