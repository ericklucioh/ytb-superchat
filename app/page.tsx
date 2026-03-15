// app/superchats/page.tsx (Server Component)
import SuperChatsClient from './superChatClient';

// Em Next.js estático, fazemos a chamada no cliente
export default function SuperChatsPage() {
  return <SuperChatsClient />;
}
